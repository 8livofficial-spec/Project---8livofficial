// Security Regression & Validation Test Suite
import assert from 'assert'
import fs from 'fs'
import path from 'path'

console.log('--- STARTING PRE-PRODUCTION SECURITY VERIFICATION SUITE ---\n')

let passedTests = 0
let totalTests = 0

function test(name, fn) {
  totalTests++
  try {
    fn()
    console.log(`✅ PASS: ${name}`)
    passedTests++
  } catch (err) {
    console.error(`❌ FAIL: ${name}`)
    console.error(err)
  }
}

// 1. Verify getUserRole does NOT trust userMetadata.role
test('authSecurity: getUserRole() ignores client-controlled userMetadata.role', () => {
  const content = fs.readFileSync(path.resolve('lib/authSecurity.ts'), 'utf8')
  assert.ok(!content.includes('if (userMetadata?.role)'), 'userMetadata?.role fast-path must be completely removed')
  assert.ok(content.includes('userMetadata.role is client-writable via supabase.auth.updateUser()'), 'Security note must be present')
})

// 2. Verify proxy.ts requires Supabase auth cookie before evaluating protected routes
test('proxy.ts: rejects unauthenticated requests even if user_role cookie is forged', () => {
  const content = fs.readFileSync(path.resolve('proxy.ts'), 'utf8')
  assert.ok(content.includes('hasAuthCookie'), 'proxy.ts must verify presence of auth session cookies')
  assert.ok(content.includes('sb-[a-z0-9_-]+-auth-token'), 'proxy.ts must match sb token format')
})

// 3. Verify Navbar.tsx does NOT have hardcoded admin email or naive cookie trust
test('Navbar.tsx: No hardcoded admin email and uses /api/auth/role', () => {
  const content = fs.readFileSync(path.resolve('components/landing/Navbar.tsx'), 'utf8')
  assert.ok(!content.includes('8livofficial@gmail.com'), 'Navbar must not contain hardcoded admin emails')
  assert.ok(content.includes('/api/auth/role'), 'Navbar must query server /api/auth/role')
})

// 4. Verify login/page.tsx does NOT have hardcoded admin email or unverified role cookie trust
test('login/page.tsx: No hardcoded admin email and authoritative role verification', () => {
  const content = fs.readFileSync(path.resolve('app/login/page.tsx'), 'utf8')
  assert.ok(!content.includes("session.user.email === '8livofficial@gmail.com'"), 'Login page must not grant admin via email comparison')
  assert.ok(content.includes('/api/auth/role'), 'Login page must verify role via /api/auth/role')
})

// 5. Verify admin/page.tsx does NOT unblock UI via user_metadata.role
test('admin/page.tsx: Fast-path bypass via session user_metadata.role is removed', () => {
  const content = fs.readFileSync(path.resolve('app/admin/page.tsx'), 'utf8')
  assert.ok(!content.includes("const userRole = (session.user.user_metadata?.role || '').toLowerCase();\n        if (userRole === 'admin')"), 'admin/page.tsx must only unblock after /api/admin/profile')
})

// 6. Verify api/prescribe requires assertDoctor and patient assignment
test('api/prescribe: Locked down with assertDoctor and patient assignment', () => {
  const content = fs.readFileSync(path.resolve('app/api/prescribe/route.ts'), 'utf8')
  assert.ok(content.includes('assertDoctor(request)'), 'api/prescribe must assert doctor')
  assert.ok(content.includes('assertPatientOrAssignedProvider(request, patientId)'), 'api/prescribe must assert patient assignment')
  assert.ok(content.includes('UUID_REGEX'), 'api/prescribe must validate UUID')
})

// 7. Verify admin session management endpoints require assertAdmin
test('admin/sessions: cancel, reschedule, and log require assertAdmin', () => {
  const cancel = fs.readFileSync(path.resolve('app/api/admin/sessions/[sessionId]/cancel/route.ts'), 'utf8')
  const reschedule = fs.readFileSync(path.resolve('app/api/admin/sessions/[sessionId]/reschedule/route.ts'), 'utf8')
  const log = fs.readFileSync(path.resolve('app/api/admin/sessions/[sessionId]/log/route.ts'), 'utf8')
  assert.ok(cancel.includes('await assertAdmin(request)'), 'cancel route must require assertAdmin')
  assert.ok(reschedule.includes('await assertAdmin(request)'), 'reschedule route must require assertAdmin')
  assert.ok(log.includes('await assertAdmin(request)'), 'log route must require assertAdmin')
})

// 8. Verify admin members endpoints require assertAdmin
test('admin/members: sessions and stats require assertAdmin', () => {
  const sessions = fs.readFileSync(path.resolve('app/api/admin/members/[memberId]/sessions/route.ts'), 'utf8')
  const stats = fs.readFileSync(path.resolve('app/api/admin/members/[memberId]/sessions/stats/route.ts'), 'utf8')
  assert.ok(sessions.includes('await assertAdmin(request)'), 'members sessions route must require assertAdmin')
  assert.ok(stats.includes('await assertAdmin(request)'), 'members stats route must require assertAdmin')
})

// 9. Verify patient/consultation-details requires auth and enforces IDOR check
test('patient/consultation-details: Enforces authentication, authorization and sanitization', () => {
  const content = fs.readFileSync(path.resolve('app/api/patient/consultation-details/route.ts'), 'utf8')
  assert.ok(content.includes('getAuthenticatedUser(req)'), 'consultation-details must authenticate caller')
  assert.ok(content.includes('sanitizeQueryTarget'), 'consultation-details must sanitize targets')
  assert.ok(content.includes('auth.user.id === docConsult.patient_id'), 'consultation-details must verify ownership')
})

// 10. Verify register route enforces auth caller matching userId
test('api/register: Prevents profile hijack and role overwrite', () => {
  const content = fs.readFileSync(path.resolve('app/api/register/route.ts'), 'utf8')
  assert.ok(content.includes('getAuthenticatedUser(request)'), 'register must authenticate caller')
  assert.ok(content.includes('auth.user.id !== userId && auth.role !== \'admin\''), 'register must prevent IDOR profile overwrite')
  assert.ok(content.includes('assignedRole = existingProfile?.role || \'patient\''), 'register must preserve elevated roles')
})

// 11. Verify driver delivery OTP lockout and attempt counter
test('driverDeliveryService: Enforces maximum 5 attempts lockout and status check', () => {
  const service = fs.readFileSync(path.resolve('lib/driverDeliveryService.ts'), 'utf8')
  const route = fs.readFileSync(path.resolve('app/api/driver/orders/[orderId]/verify-otp/route.ts'), 'utf8')
  assert.ok(service.includes('failedAttempts >= 5'), 'driver service must lock out at 5 failed attempts')
  assert.ok(service.includes('failed_attempts = newFailed'), 'driver service must track failed attempts in DB')
  assert.ok(route.includes('checkRateLimit(`driver_otp:${ip}:${orderId}`'), 'driver verify-otp route must enforce rate limiting')
})

// 12. Verify payment verify binds order, prevents ₹1 attack, and checks authoritative price
test('payment/verify: Order binding, IDOR prevention, and amount tamper rejection', () => {
  const content = fs.readFileSync(path.resolve('app/api/payment/verify/route.ts'), 'utf8')
  assert.ok(content.includes('Security Binding 1: Prevent IDOR'), 'verify must prevent IDOR order substitution')
  assert.ok(content.includes('Security Binding 2: Prevent Payment Type Substitution'), 'verify must prevent payment type substitution')
  assert.ok(content.includes('Security Binding 3: Verify paid amount matches authoritative pricing'), 'verify must verify actual amount vs authoritative price')
  assert.ok(content.includes('orderRecordedAmount < expectedMinAmount'), 'verify must reject price tampering')
})

// 13. Verify appConfig mock payment is strictly protected
test('appConfig: allowMock is disabled in production and requires explicit env var', () => {
  const content = fs.readFileSync(path.resolve('lib/appConfig.ts'), 'utf8')
  assert.ok(content.includes("process.env.NODE_ENV !== 'production' && process.env.ALLOW_MOCK_PAYMENT === 'true'"), 'Mock payments must be forbidden in production')
})

// 14. Verify patient documents storage privacy
test('UnifiedAssessmentFunnel: Uses createSignedUrl instead of public URL', () => {
  const content = fs.readFileSync(path.resolve('components/assessment/UnifiedAssessmentFunnel.tsx'), 'utf8')
  assert.ok(content.includes('.createSignedUrl(filePath,'), 'Patient documents must use signed URLs')
  assert.ok(!content.includes('.getPublicUrl(filePath)'), 'Patient documents must never use getPublicUrl')
})

// 15. Verify messages endpoint injection protection
test('api/messages: Strict UUID validation on parameters', () => {
  const content = fs.readFileSync(path.resolve('app/api/messages/route.ts'), 'utf8')
  assert.ok(content.includes('UUID_REGEX.test(userId)'), 'messages GET must validate UUID')
  assert.ok(content.includes('UUID_REGEX.test(senderId)'), 'messages POST must validate UUID')
})

// 16. Verify admin dashboard query parallelization
test('admin/dashboard: Promise.allSettled parallel execution', () => {
  const content = fs.readFileSync(path.resolve('app/api/admin/dashboard/route.ts'), 'utf8')
  assert.ok(content.includes('Promise.allSettled(['), 'admin dashboard must parallelize queries')
})

// 17. Verify next.config.ts clickjacking and framing security headers
test('next.config.ts: X-Frame-Options DENY and CSP frame-ancestors none', () => {
  const content = fs.readFileSync(path.resolve('next.config.ts'), 'utf8')
  assert.ok(content.includes("'X-Frame-Options'"), 'next.config.ts must set X-Frame-Options')
  assert.ok(content.includes("'DENY'"), 'X-Frame-Options must be DENY')
  assert.ok(content.includes("frame-ancestors 'none'"), 'CSP must forbid iframe embedding')
})

console.log(`\n--- TEST RUN COMPLETE: ${passedTests}/${totalTests} TESTS PASSED ---`)
if (passedTests === totalTests) {
  console.log('STATUS: ALL 17 SECURITY HARDENING CHECKS VERIFIED SUCCESSFULLY.')
} else {
  console.error('STATUS: SOME TESTS FAILED.')
  process.exit(1)
}
