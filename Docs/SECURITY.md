# 8LIV Cybersecurity Assessment Report

**Assessment date:** 29 October 2026

**Assessed revision:** `d20a2e5`

**Application:** 8LIV healthcare web platform

**Overall risk rating:** **Critical**

**Assessment type:** Source-assisted static security review and software composition analysis

## 1. Executive summary

The 8LIV application contains a solid baseline of security controls, including server-side Supabase token verification, role and ownership checks, webhook HMAC validation, row-level security migrations, secure password/token generation, security headers, upload limits, and non-root container execution.

The application is not ready for production security sign-off in its assessed state. The most urgent issue is the pinned `next@16.2.6` framework version, for which the current npm advisory database reports critical unauthenticated remote-code-execution vulnerabilities. The production dependency tree also contains high-severity issues in Nodemailer, Axios, `follow-redirects`, Nano ID, `source-map-js`, Sharp, and PostCSS-related packages.

The most significant application-level concern is tenant selection. Ten routes derive the tenant from an attacker-controlled `x-tenant-id` header or client-writable Supabase `user_metadata`. If multiple tenants are enabled, this can undermine tenant isolation. Other important weaknesses include process-local rate limiting, a five-minute authentication cache that may accept stale/revoked authorization during an upstream failure, incomplete Content Security Policy protection, encryption-key reuse, and internal error disclosure.

### Risk summary

| Severity | Count | Status |
|---|---:|---|
| Critical | 1 | Open |
| High | 2 | Open |
| Medium | 6 | Open |
| Low | 2 | Open |

**Immediate decision:** Do not release the assessed dependency set to production. Patch and retest SEC-001 before deployment. If the platform serves multiple tenants, treat SEC-003 as an immediate release blocker as well.

## 2. Scope and methodology

### In scope

- Next.js frontend and server-side route handlers under `frontend/`
- 152 API route files and 393 TypeScript/TSX source files
- Authentication, authorization, patient/provider/admin boundaries, payments, video, WhatsApp, uploads, consent, and sensitive-data handling
- Supabase access patterns and 50 SQL/migration files under `Database/`
- Production container and deployment configuration
- Production dependency tree in `frontend/package-lock.json`
- Prior Strix scan artifacts under `strix_runs/`

### Methods used

- Manual source review focused on OWASP Top 10 and healthcare-data risks
- Route-level authentication, role, ownership, and object-access review
- Trust-boundary review for headers, JWT/user metadata, webhooks, uploads, and service-role database access
- Secret-handling and build-artifact inspection without disclosing secret values
- `npm audit --json --omit=dev` on 29 October 2026
- Dependency-path verification with `npm ls`
- Review of existing Strix SARIF/JSON findings

### Limitations

This was not an authenticated penetration test. No production endpoint, Supabase project, cloud account, payment gateway, email server, Stream account, or WhatsApp account was attacked. Runtime infrastructure configuration, database policies actually deployed to production, logging/alert delivery, backups, incident response, and third-party contracts were not independently verified. The report is a point-in-time security assessment, not a legal, privacy, or regulatory certification.

## 3. System and data risk context

The application handles high-impact data and operations:

- Patient identity, contact details, health assessments, nutrition information, prescriptions, consultations, and consent records
- Clinician and provider identity, professional verification, signatures, and care-team relationships
- Payment, refund, payout, wallet, and bank-account information
- Video consultation access tokens and meeting identifiers
- WhatsApp OTP and messaging workflows
- Administrative reporting and bulk access to patient/provider records

The server commonly uses a Supabase service-role client, which intentionally bypasses row-level security. This makes route-level authorization and ownership filtering a critical control: a single missing check can expose or modify data across the entire database.

## 4. Detailed findings

### SEC-001 — Vulnerable Next.js version permits critical server compromise

**Severity:** Critical

**OWASP:** A06:2021 Vulnerable and Outdated Components

**Status:** Open

#### Evidence

- `frontend/package.json:28` pins `next` to `16.2.6`.
- The current production dependency audit reports one critical package-level finding for Next.js and identifies `16.4.3` as an available non-major fix.
- Reported advisories include unauthenticated RCE in Windows-hosted servers, AVIF/SVG image optimization, `next/og` `ImageResponse`, and `use cache` typed-array deserialization, plus SSRF, authorization bypass, cache confusion, and denial-of-service issues.
- The application enables Next.js image functionality and creates a standalone server build, so framework-level server vulnerabilities must be treated as reachable until disproved by a controlled retest.

#### Impact

Successful exploitation could allow unauthenticated code execution, disclosure or modification of patient data, theft of service credentials, payment and messaging compromise, and full application takeover.

#### Remediation

1. Upgrade `next` and `eslint-config-next` to at least the fixed version reported by the audit (`16.4.3` at assessment time), or a later supported patched release.
2. Regenerate the lockfile with a clean install and rebuild the container.
3. Run the full test suite, verify image optimization and server actions, then rerun `npm audit --omit=dev`.
4. Rotate application secrets if the vulnerable build has been exposed to untrusted traffic and review logs for anomalous image, server-action, or cache requests.

#### Acceptance criteria

- No Critical or High Next.js advisory remains in the production dependency audit.
- The deployed image and runtime report the patched Next.js version.

### SEC-002 — Multiple vulnerable production dependencies

**Severity:** High

**OWASP:** A06:2021 Vulnerable and Outdated Components

**Status:** Open

#### Evidence

`npm audit --omit=dev` reports 9 vulnerable production packages in aggregate: 1 Critical, 7 High, and 1 Moderate. In addition to Next.js, verified installed versions include:

| Package | Installed | Selected risk | Dependency path |
|---|---:|---|---|
| `nodemailer` | 9.0.1 | Address-parser DoS, recipient validation bypass, SSRF/file access issues | Direct |
| `axios` | 1.18.1 | Prototype-pollution request manipulation, SSRF/control bypass, socket hijacking, ReDoS | Razorpay and Stream SDK |
| `follow-redirects` | 1.16.0 | Cross-origin credential/header disclosure | Razorpay → Axios |
| `nanoid` | 3.3.12 | Infinite-loop denial of service in non-secure/custom generators | PostCSS paths |
| `source-map-js` | 1.2.1 | Event-loop denial of service | Tailwind/PostCSS paths |
| `baseline-browser-mapping` | 2.10.29 | Process termination on invalid input | Next.js/build paths |
| `sharp` | transitive | Native image-processing memory-safety issues | Next.js |
| `postcss` | transitive | Path traversal/file disclosure and CSS output issues | Next.js |

The earlier Strix assessment found only three Axios advisories; the current audit demonstrates that the dependency risk has expanded and the earlier result is no longer complete.

#### Impact

Depending on the invoked code path, attackers may cause denial of service, alter outbound requests, bypass redirect/proxy controls, expose credentials, read local data, or exploit native image processing.

#### Remediation

- Upgrade direct dependencies first: Next.js, Nodemailer, Razorpay, and Stream SDK.
- Use lockfile overrides only as a temporary, tested measure where the parent package cannot yet be upgraded.
- Add automated production-dependency scanning to pull requests and deployment gates.
- Fail builds on Critical findings and require explicit security approval for accepted High findings.

### SEC-003 — Tenant identity is accepted from attacker-controlled data

**Severity:** High when multi-tenancy is enabled; Low in a permanently single-tenant deployment

**OWASP:** A01:2021 Broken Access Control

**Status:** Open

#### Evidence

- `frontend/lib/apiSecurity.ts:194-200` implements `resolveTenant()`.
- `frontend/lib/apiSecurity.ts:195` accepts `x-tenant-id` directly from the HTTP request.
- `frontend/lib/apiSecurity.ts:197` falls back to `user.user_metadata.tenant_id`; the project correctly notes elsewhere that Supabase `user_metadata` is client-writable and must not be trusted for authorization.
- Ten dietitian/patient API routes use this resolved tenant value in data operations.

#### Impact

If multiple tenant datasets exist, an authenticated user may select another tenant identifier. Depending on the route's additional provider/patient filters and record relationships, this can cause cross-tenant reads, writes, or data misclassification. Even when an ownership filter prevents direct disclosure, accepting an untrusted tenant can corrupt tenant attribution.

#### Remediation

1. Derive tenant identity only from a server-controlled membership table or immutable, server-issued `app_metadata` claim.
2. Never use `x-tenant-id` without verifying the authenticated user's active membership in that tenant.
3. Remove the `user_metadata` fallback.
4. Include tenant ID in every authorization and ownership query, and add database constraints/RLS as a second layer.
5. Add negative tests proving users cannot read or write another tenant by changing headers or JWT user metadata.

### SEC-004 — Rate limiting is local to one process and trusts forwarded IP headers

**Severity:** Medium

**OWASP:** A04:2021 Insecure Design / API4 Unrestricted Resource Consumption

**Status:** Open

#### Evidence

- `frontend/lib/authSecurity.ts:14` stores limits in an in-memory `Map`.
- `frontend/lib/authSecurity.ts:65-68` accepts the first `x-forwarded-for` value or `x-real-ip` without an explicit trusted-proxy boundary.
- The deployment configuration can scale to 10 Cloud Run instances, so each instance has a separate counter and counters reset on restart/cold start.
- Rate limiting is used on authentication, OTP, booking, upload, and sensitive administrative flows, making consistency important.

#### Impact

Attackers can distribute requests across instances, wait for cold starts, or potentially spoof IP headers if the edge does not overwrite them. This weakens protections against credential stuffing, OTP abuse, email flooding, booking abuse, upload exhaustion, and payment/admin endpoint abuse.

#### Remediation

- Replace the in-memory map with an atomic shared store such as Redis/Valkey or a managed rate-limiting service.
- Key authenticated limits by user/account plus a normalized edge-provided IP.
- Configure the platform to overwrite forwarding headers and trust only the known proxy chain.
- Add route-specific burst and sustained limits, OTP destination limits, and monitoring for throttling events.

### SEC-005 — Authentication cache can preserve revoked access and fails open during upstream errors

**Severity:** Medium

**OWASP:** A07:2021 Identification and Authentication Failures

**Status:** Open

#### Evidence

- `frontend/lib/apiSecurity.ts:14-16` creates a global token cache.
- `frontend/lib/apiSecurity.ts:70-72` accepts cached identity/role information for five minutes.
- `frontend/lib/apiSecurity.ts:79-84` caches the resolved role with the user.
- `frontend/lib/apiSecurity.ts:87-91` returns cached authorization when Supabase token verification encounters a network error.

#### Impact

A revoked session, removed admin role, suspended provider, or changed authorization relationship may remain accepted for up to five minutes on an instance. During an authentication-service outage, the route explicitly fails open to cached authorization. This is particularly important for administration, refunds, payouts, prescriptions, and health records.

#### Remediation

- Do not cache authorization decisions for privileged or sensitive mutations.
- Cache only validated token identity for a short period and re-resolve roles/account status for sensitive operations.
- Fail closed when verification cannot be completed for admin, payment, payout, prescription, and export endpoints.
- Add revocation/version claims or a server-side session version that changes when roles or account status change.

### SEC-006 — Password and activation link origin has a host-header fallback

**Severity:** Medium (configuration-dependent)

**OWASP:** A07:2021 Identification and Authentication Failures

**Status:** Open

#### Evidence

- `frontend/lib/authSecurity.ts:43-62` builds an origin.
- When `NEXT_PUBLIC_SITE_URL` and `NEXT_PUBLIC_APP_URL` are absent, `frontend/lib/authSecurity.ts:49-53` trusts `x-forwarded-host` and `x-forwarded-proto`.
- The origin is used for password reset, email verification, provider activation, and admin-created invitation links, including `frontend/app/api/auth/forgot-password/route.ts:62`.
- Both canonical URL variables are configured in the reviewed local environment, so the fallback is not active in that observed configuration. Production configuration was not verified.

#### Impact

If a deployment omits the canonical URL and allows an attacker-influenced forwarded host, security emails can contain an attacker-domain link carrying a valid reset, verification, or activation token. A victim who clicks it may disclose the token to the attacker.

#### Remediation

- Make a validated HTTPS canonical origin mandatory in production and fail startup if missing.
- Do not derive security-email links from request headers.
- Allow-list the application hostname and reject unexpected `Host`/forwarded-host values at the edge.

### SEC-007 — Sensitive provider data encryption reuses the database service credential as fallback key material

**Severity:** Medium

**OWASP:** A02:2021 Cryptographic Failures

**Status:** Open

#### Evidence

- `frontend/lib/providerPlatform/crypto.ts:7` uses `PROVIDER_DATA_ENCRYPTION_KEY || SUPABASE_SERVICE_ROLE_KEY`.
- `frontend/lib/providerPlatform/crypto.ts:11` derives the AES-256-GCM key by hashing that value.
- The ciphertext carries a key-version label, but decryption always calls the single current `getKey()` and does not select historical key material by version.

#### Impact

Compromise of the service-role key also exposes encrypted provider/banking data, defeating key separation. Rotating the Supabase service-role key can make stored ciphertext unavailable when the dedicated encryption key was not configured. The current design also lacks a usable multi-key rotation path.

#### Remediation

- Require a dedicated, random encryption key; remove the service-role fallback.
- Store encryption keys in a managed KMS/secret manager and restrict access separately from database credentials.
- Implement version-to-key lookup and a tested re-encryption/rotation procedure.
- Consider envelope encryption for bank-account data and log decrypt operations.

### SEC-008 — Content Security Policy only prevents framing

**Severity:** Medium

**OWASP:** A03:2021 Injection / A05:2021 Security Misconfiguration

**Status:** Open

#### Evidence

- `frontend/next.config.ts:52-53` sets `Content-Security-Policy: frame-ancestors 'none';` only.
- No `default-src`, `script-src`, `connect-src`, `img-src`, `style-src`, `font-src`, `object-src`, `base-uri`, or `form-action` directives are present.
- `X-Frame-Options: DENY`, HSTS, `nosniff`, Referrer Policy, and Permissions Policy are present and are positive controls.

#### Impact

The CSP provides clickjacking protection but does not materially constrain script execution, data exfiltration, form destinations, plugins, or third-party connections if an injection flaw is introduced elsewhere.

#### Remediation

- Deploy a nonce- or hash-based CSP suitable for Next.js.
- Start with Report-Only, collect violations, then enforce.
- Explicitly allow only required Supabase, Stream, Razorpay, Google Maps, image, font, and analytics origins.
- Add `object-src 'none'`, `base-uri 'self'`, and a narrow `form-action` policy.

### SEC-009 — Internal exception and database details are returned to clients

**Severity:** Medium

**OWASP:** A05:2021 Security Misconfiguration

**Status:** Open

#### Evidence

Several routes return raw `error.message` or `err.message` to clients. Examples include:

- `frontend/app/api/admin/payments/refund/route.ts:26,29`
- `frontend/app/api/provider/plans/upload/route.ts:124`
- `frontend/app/api/consent/gate1/route.ts:58`

Similar patterns occur across the API tree.

#### Impact

Database table/column names, validation behavior, provider errors, operational states, and internal implementation details may be disclosed. This improves attacker reconnaissance and can expose sensitive operational metadata in support screenshots or client logs.

#### Remediation

- Return stable public error codes and generic client messages.
- Log detailed exceptions only on the server with a correlation ID and appropriate redaction.
- Map expected authorization, validation, conflict, and not-found errors to consistent 4xx responses rather than generic 500 responses.

### SEC-010 — Uploaded files are not content-sniffed or malware-scanned

**Severity:** Low

**OWASP:** A04:2021 Insecure Design

**Status:** Open

#### Evidence

- `frontend/app/api/provider/plans/upload/route.ts:73-92` validates size, filename extension, and browser-supplied MIME type.
- `frontend/app/api/provider/plans/upload/route.ts:97-106` stores the supplied bytes directly.
- No magic-byte/content parser validation, archive safety checks, or malware scanning is performed in this route.
- Authentication, provider role, care-team assignment, storage path scoping, and size limits are implemented correctly.

#### Impact

An authorized but compromised provider account can upload content whose true type differs from its name/MIME value. Risk depends on storage-bucket download headers and how patient devices or downstream systems process the file.

#### Remediation

- Validate magic bytes and parse supported document formats before release.
- Store uploads in a private quarantine area, scan them, then promote clean files.
- Force safe download headers (`Content-Disposition: attachment`, `nosniff`) and never render active content inline.

### SEC-011 — Local standalone build contains environment files

**Severity:** Low in the reviewed deployment; High if locally built standalone output is distributed

**OWASP:** A05:2021 Security Misconfiguration

**Status:** Open

#### Evidence

- The local `frontend/.next/standalone/` directory contains `.env` and `.env.local` files with the same sizes as the working environment files. Secret values were not printed or included in this report.
- Both environment files and `.next/` are ignored by Git.
- `.dockerignore` excludes environment files, and the documented multi-stage Cloud Build therefore should not receive local environment files in its build context.
- `frontend/Dockerfile:42` copies the entire standalone directory into the runtime image.

#### Impact

The documented clean cloud build is protected by `.dockerignore`, but a developer who packages or deploys the existing local standalone directory may distribute database, email, payment, video, and messaging credentials.

#### Remediation

- Never distribute a developer-generated `.next/standalone` directory.
- Add a CI check that fails if `.env*`, private keys, or credential patterns exist in build artifacts or container layers.
- Inject runtime secrets from the cloud secret manager rather than build files.
- Remove local build artifacts before sharing the workspace or creating archives.

## 5. Positive security controls observed

- Supabase access tokens are verified server-side with `auth.getUser(token)` rather than trusting decoded JWT content alone.
- Central helpers implement admin, doctor, provider, dietitian, patient, assignment, and ownership checks.
- Patient and receipt routes commonly constrain service-role queries by the authenticated patient/owner ID.
- WhatsApp and Razorpay webhook routes validate signatures using raw request bodies and timing-safe comparison patterns.
- Password reset and verification tokens use 32 random bytes and store SHA-256 hashes rather than plaintext tokens.
- Password complexity checks and account/role lookup logic avoid trusting client-writable role metadata.
- Many authentication, booking, upload, and admin-sensitive routes apply rate limits, even though the store must be made distributed.
- Uploads have role, assignment, size, extension, and MIME controls.
- Database migrations contain 101 RLS enable statements and 130 policy statements; deployment parity still requires verification.
- The production container runs as an unprivileged user.
- HSTS, `nosniff`, frame denial, Referrer Policy, and Permissions Policy headers are configured.
- Environment files, build output, and dependencies are excluded from Git; the repository does not track the reviewed local environment files.

## 6. Prioritized remediation plan

### Within 24 hours

1. Upgrade Next.js to a patched supported release and rebuild from a clean lockfile.
2. Rerun production dependency scanning and block release until Critical/High framework findings are cleared or formally mitigated.
3. If a vulnerable build has been internet-exposed, preserve logs, review indicators, and prepare credential rotation.
4. Confirm whether production is multi-tenant. If yes, remove unverified tenant selection immediately.

### Within 7 days

1. Upgrade Nodemailer, Razorpay/Stream dependency chains, Axios, `follow-redirects`, and remaining vulnerable packages.
2. Replace in-memory rate limiting with a distributed store and trusted-proxy configuration.
3. Require the production canonical URL and remove host-header fallback for security links.
4. Remove the service-role encryption-key fallback and establish a dedicated key.
5. Disable fail-open cached authorization on privileged endpoints.

### Within 30 days

1. Deploy an enforced, tested CSP.
2. Standardize public error responses and correlation IDs.
3. Add malware/content validation for provider uploads.
4. Add automated SAST, secret scanning, dependency scanning, container scanning, and artifact secret checks to CI.
5. Add authorization regression tests across patient, provider, doctor, dietitian, admin, and tenant roles.
6. Conduct an authenticated staging penetration test focused on IDOR/BOLA, role escalation, payment/payout integrity, prescription access, video tokens, webhook replay, and upload handling.

## 7. Required security regression tests

- A patient cannot read or mutate another patient's appointment, prescription, receipt, notification, assessment, plan, food log, or consultation.
- A provider cannot access an unassigned patient or operate outside the provider's verified role.
- A dietitian/provider cannot cross tenants by changing `x-tenant-id`, JWT `user_metadata`, query parameters, or object IDs.
- A suspended/deactivated provider and a revoked admin session lose access immediately to sensitive mutations.
- OTP, login, reset, resend, booking, upload, payment, refund, and payout limits hold across multiple application instances.
- Reset, verification, and activation emails always use the canonical HTTPS domain regardless of request headers.
- Webhooks reject missing, malformed, replayed where applicable, and invalid signatures without changing state.
- Payment verification binds gateway identifiers, amount, currency, user, and order and remains idempotent.
- Uploaded polyglots, renamed executables, malformed documents, oversized archives, and known test malware are quarantined/rejected.
- Every production response contains the intended security headers and no raw internal exception details.

## 8. Retest and closure criteria

The application can be considered ready for a production security sign-off only after:

1. SEC-001 is closed and no Critical production dependency finding remains.
2. All High findings are closed or have documented, time-bound risk acceptance approved by the system owner.
3. Tenant isolation is proven by automated negative tests if multi-tenancy is supported.
4. The production container is scanned and verified not to contain environment files or plaintext secrets.
5. An authenticated staging penetration test finds no Critical or High exploitable issue.
6. Remediation evidence and test outputs are attached to the release record.

## 9. Reference advisories from the assessment

- Next.js and transitive package advisories: current npm audit result for `frontend/package-lock.json` on 29 October 2026
- Axios advisories include `GHSA-vh66-26gq-q6x8`, `GHSA-c29m-xwm3-cm6r`, `GHSA-3pq3-5fj3-cg6v`, `GHSA-m8m8-qj5v-23w3`, and `GHSA-r4gj-5m52-g5wh`
- `follow-redirects`: `GHSA-q3jh-wrc6-jgq8` and `GHSA-8r9p-f939-6h3c`
- Nano ID: `GHSA-28wg-ghj8-5hjv` and `GHSA-2v37-7h3g-55p8`

Advisories and fixed versions change over time. Re-run the audit immediately before release rather than relying only on this snapshot.
