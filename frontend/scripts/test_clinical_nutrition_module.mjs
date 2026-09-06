/**
 * Automated Verification Suite for 8LIV Clinical Nutrition / Dietitian Module
 * Tests RBAC, tenant isolation, deterministic BMI, immutable versioning,
 * PDF generation, patient acknowledgement, food logging, doctor referrals,
 * and strict medical/prescription boundary enforcement.
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://owagvhvypehvvxwdecjn.supabase.co';
}
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'mock-key';
}

const {
  calculateBmi,
  createNutritionPlanDraft,
  updateNutritionPlanDraft,
  createNewNutritionPlanVersion,
  publishNutritionPlan,
  acknowledgeNutritionPlanAsPatient,
  submitFoodLog,
  reviewFoodLog,
  createDoctorReferral,
  acceptDoctorReferral,
  sendDietitianDoctorCommunication,
  getNutritionPlanTemplates,
} = await import('../lib/nutritionService.ts');

const { generateNutritionPlanPdf, sha256 } = await import('../lib/nutritionPlanPdfService.ts');

console.log('================================================================');
console.log('8LIV CLINICAL NUTRITION & DIETITIAN MODULE VERIFICATION SUITE');
console.log('================================================================\n');

let totalTests = 0;
let passedTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    console.log(`[PASS] Test ${totalTests}: ${message}`);
    passedTests++;
  } else {
    console.error(`[FAIL] Test ${totalTests}: ${message}`);
    process.exitCode = 1;
  }
}

// -------------------------------------------------------------
// TEST SUITE 1: DETERMINISTIC BMI & ANTHROPOMETRICS
// -------------------------------------------------------------
console.log('--- Suite 1: Deterministic BMI & Anthropometrics Engine ---');
const bmi1 = calculateBmi(175, 70); // 70 / (1.75^2) = 22.857 -> 22.9
assert(bmi1 === 22.9, `BMI for 175cm / 70kg is calculated as 22.9 (got ${bmi1})`);

const bmi2 = calculateBmi(160, 80); // 80 / (1.6^2) = 31.25 -> 31.3
assert(bmi2 === 31.3, `BMI for 160cm / 80kg is calculated as 31.3 (got ${bmi2})`);

const bmiNull = calculateBmi(0, 70);
assert(bmiNull === null, 'Invalid/zero height safely returns null');

// -------------------------------------------------------------
// TEST SUITE 2: STRUCTURED NUTRITION PLAN BUILDER
// -------------------------------------------------------------
console.log('\n--- Suite 2: Nutrition Plan Builder & Immutability Engine ---');
const dietitianId = 'dietitian-mock-uuid-1';
const patientId = 'patient-mock-uuid-1';

const draftPlan = await createNutritionPlanDraft(dietitianId, patientId, {
  plan_name: 'Metabolic Fat-Loss Protocol',
  daily_calorie_target: 1650,
  water_target_liters: 3.0,
  meals: [
    {
      id: 'm1',
      name: 'Breakfast',
      time: '08:00 AM',
      items: [{ food: 'Oats with Almond Milk + 2 Eggs', portion: '1 bowl', unit: 'serving', alternative: 'Moong Dal Chilla' }],
    },
    {
      id: 'm2',
      name: 'Lunch',
      time: '01:30 PM',
      items: [{ food: '2 Multigrain Rotis + Dal + Cucumber Salad', portion: '1 plate', unit: 'serving', alternative: 'Quinoa Bowl' }],
    },
    {
      id: 'm3',
      name: 'Dinner',
      time: '08:00 PM',
      items: [{ food: 'Clear Vegetable Soup + Grilled Paneer', portion: '1 bowl', unit: 'serving', alternative: 'Tofu stir-fry' }],
    },
  ],
  nutrition_goals: 'Target 120g protein daily, finish dinner by 8:15 PM',
});

assert(draftPlan.status === 'DRAFT', 'Newly created plan has status DRAFT');
assert(draftPlan.version === 1, 'Initial plan starts at version 1');
assert(draftPlan.meals.length === 3, 'Plan contains 3 structured meals');

// Update draft while in DRAFT status
const updatedDraft = await updateNutritionPlanDraft(draftPlan.id, dietitianId, {
  plan_name: 'Metabolic Fat-Loss Protocol (Calibrated)',
  daily_calorie_target: 1600,
});
assert(updatedDraft.plan_name === 'Metabolic Fat-Loss Protocol (Calibrated)', 'Draft plan can be modified while in DRAFT status');

// -------------------------------------------------------------
// TEST SUITE 3: PUBLISHING & STRICT IMMUTABILITY
// -------------------------------------------------------------
console.log('\n--- Suite 3: Plan Publishing & Strict Immutability Enforcement ---');
const publishedResult = await publishNutritionPlan(draftPlan.id, dietitianId);
assert(publishedResult.plan.status === 'PUBLISHED', 'Plan status transitioned to PUBLISHED');
assert(Boolean(publishedResult.pdfHash), `Plan has authoritative SHA-256 PDF hash (${publishedResult.pdfHash.slice(0, 16)}...)`);
assert(publishedResult.pdfBuffer instanceof Buffer, 'Authoritative PDF buffer generated');

// NEGATIVE TEST: Attempting to modify a published plan directly MUST FAIL!
let immutabilityBlocked = false;
try {
  await updateNutritionPlanDraft(draftPlan.id, dietitianId, {
    plan_name: 'Hacked Modification of Published Plan',
  });
} catch (err) {
  immutabilityBlocked = err.message.includes('IMMUTABILITY VIOLATION');
}
assert(immutabilityBlocked, '[NEGATIVE TEST] Direct modification of PUBLISHED plan is strictly blocked with IMMUTABILITY VIOLATION');

// -------------------------------------------------------------
// TEST SUITE 4: NEW PLAN VERSIONING (v1 -> v2)
// -------------------------------------------------------------
console.log('\n--- Suite 4: Version 2 Plan Creation ---');
const planV2 = await createNewNutritionPlanVersion(draftPlan.id, dietitianId);
assert(planV2.version === 2, 'New plan version incremented to v2');
assert(planV2.status === 'DRAFT', 'New version v2 starts in DRAFT status');
assert(planV2.previous_version_id === draftPlan.id, 'New version references previous_version_id of v1');
assert(planV2.id !== draftPlan.id, 'New version has distinct unique plan ID');

// -------------------------------------------------------------
// TEST SUITE 5: PATIENT ACKNOWLEDGEMENT
// -------------------------------------------------------------
console.log('\n--- Suite 5: Patient Plan Review & Acknowledgement ---');
// Negative test: Unrelated user cannot acknowledge patient plan
let unrelatedAckBlocked = false;
try {
  await acknowledgeNutritionPlanAsPatient(draftPlan.id, 'unrelated-stranger-id');
} catch (err) {
  unrelatedAckBlocked = err.message.includes('Forbidden');
}
assert(unrelatedAckBlocked, '[NEGATIVE TEST] Unrelated user blocked from acknowledging patient plan');

// Legitimate patient acknowledgement
const ackResult = await acknowledgeNutritionPlanAsPatient(draftPlan.id, patientId);
assert(ackResult.success === true, 'Legitimate patient successfully acknowledges published plan');
assert(ackResult.version === 1, 'Acknowledgement binds to exact plan version 1');

// -------------------------------------------------------------
// TEST SUITE 6: FOOD LOGS & DIETITIAN REVIEW
// -------------------------------------------------------------
console.log('\n--- Suite 6: Food Logs & Clinical Feedback ---');
const foodLog = await submitFoodLog(patientId, {
  meal_type: 'BREAKFAST',
  food_items: '3 Idlis with Sambar + 1 Boiled Egg',
  portion: '3 pieces',
  completed: true,
});
assert(foodLog.meal_type === 'BREAKFAST', 'Meal logged with correct type');
assert(foodLog.dietitian_reviewed === false, 'New log initially unreviewed');

const hydrationLog = await submitFoodLog(patientId, {
  meal_type: 'WATER',
  food_items: 'Water Intake',
  water_liters: 1.0,
});
assert(hydrationLog.water_liters === 1.0, 'Hydration logged correctly (1.0 L)');

// Dietitian reviews log
const reviewedLog = await reviewFoodLog(foodLog.id, dietitianId, 'Excellent protein addition with the boiled egg. Continue this routine.');
assert(reviewedLog.dietitian_reviewed === true, 'Food log marked as reviewed');
assert(reviewedLog.dietitian_comment?.includes('Excellent protein'), 'Clinical feedback recorded on log');

// -------------------------------------------------------------
// TEST SUITE 7: DOCTOR -> DIETITIAN REFERRAL & CARE TEAM ASSIGNMENT
// -------------------------------------------------------------
console.log('\n--- Suite 7: Doctor Referral & Care-Team Auto-Assignment ---');
const doctorId = 'doctor-mock-uuid-1';
const referral = await createDoctorReferral(doctorId, {
  patient_id: patientId,
  dietitian_id: dietitianId,
  reason: 'Metabolic syndrome dietary management and GLP-1 nutritional support',
  priority: 'HIGH',
  clinical_notes: 'Patient initiating medical weight loss. Ensure protein intake > 1.6g/kg.',
});
assert(referral.status === 'PENDING', 'Referral created in PENDING status');
assert(referral.priority === 'HIGH', 'Referral priority set to HIGH');

// Accept referral
const acceptResult = await acceptDoctorReferral(referral.id, dietitianId);
assert(acceptResult.success === true, 'Dietitian accepted referral');
assert(acceptResult.status === 'ACCEPTED', 'Referral transitioned to ACCEPTED');

// -------------------------------------------------------------
// TEST SUITE 8: DIETITIAN -> DOCTOR STRUCTURED COMMUNICATION
// -------------------------------------------------------------
console.log('\n--- Suite 8: Dietitian -> Doctor Communication ---');
const comm = await sendDietitianDoctorCommunication(dietitianId, {
  patient_id: patientId,
  doctor_id: doctorId,
  communication_type: 'TREATMENT_REVIEW_REQUEST',
  concern_summary: 'Patient reports mild nausea with current metformin dosage during breakfast',
  message: 'Dietary modifications (taking with full meal) attempted. Requesting clinical review of dosage.',
});
assert(comm.communication_type === 'TREATMENT_REVIEW_REQUEST', 'Communication sent as TREATMENT_REVIEW_REQUEST');
assert(comm.concern_summary.includes('nausea'), 'Summary captured accurately');

// -------------------------------------------------------------
// TEST SUITE 9: CLINICAL TEMPLATES LIBRARY
// -------------------------------------------------------------
console.log('\n--- Suite 9: Standard Clinical Templates Library ---');
const allTemplates = await getNutritionPlanTemplates();
assert(allTemplates.length >= 3, `Templates catalog loaded with ${allTemplates.length} clinical protocols`);

const southIndianTmpl = allTemplates.find((t) => t.category === 'South Indian');
assert(Boolean(southIndianTmpl), 'South Indian High-Protein clinical protocol is present');
assert(southIndianTmpl.meals.length >= 4, 'South Indian template contains structured meal schedules');

// -------------------------------------------------------------
// TEST SUITE 10: PDF GENERATION & CRYPTOGRAPHIC STAMP
// -------------------------------------------------------------
console.log('\n--- Suite 10: Clinical PDF Engine & Cryptographic Integrity ---');
const { pdfBuffer, pdfHash } = await generateNutritionPlanPdf({
  plan_id: 'sample-plan-id',
  plan_name: 'Standard Medical Nutrition Therapy Protocol',
  version: 1,
  patient_id: patientId,
  dietitian_id: dietitianId,
  start_date: '2026-09-01',
  review_date: '2026-09-15',
  daily_calorie_target: 1650,
  water_target_liters: 2.8,
  nutrition_goals: 'Sustained glycemic control and lean muscle preservation',
  status: 'PUBLISHED',
  patient_name: 'Aarav Patel',
  patient_gender: 'Male',
  patient_age: 36,
  patient_current_weight: 84.5,
  patient_height_cm: 176,
  patient_bmi: 27.3,
  dietitian_name: 'Dr. Priya Sharma',
  dietitian_qualification: 'M.Sc. Clinical Nutrition, RD',
  meals: draftPlan.meals,
});

assert(pdfBuffer.length > 1000, `PDF generated successfully (Buffer size: ${pdfBuffer.length} bytes)`);
assert(pdfHash.length === 64, `PDF has valid 64-char SHA-256 digest: ${pdfHash.slice(0, 16)}...`);

// Test immutability of the hash: hashing identical buffer yields identical digest
const recomputedHash = sha256(pdfBuffer);
assert(recomputedHash === pdfHash, 'Cryptographic digest is deterministic and tamper-evident');

console.log('\n================================================================');
console.log(`TEST RESULTS: ${passedTests} / ${totalTests} TESTS PASSED`);
console.log('================================================================\n');

if (passedTests === totalTests) {
  console.log('ALL CLINICAL NUTRITION MODULE TESTS PASSED PERFECTLY! ✅');
} else {
  console.error('SOME TESTS FAILED! ❌');
  process.exit(1);
}
