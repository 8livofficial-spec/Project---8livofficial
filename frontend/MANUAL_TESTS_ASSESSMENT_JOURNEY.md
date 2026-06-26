# Assessment journey manual regression tests

Use these after deploying/restarting the frontend.

1. Complete assessment → logout → login
   - Expected: user is not sent to `/assessment`.
   - Expected: eligible/review users continue to `/consultation-payment`.
   - Expected: not-eligible users go to `/not-eligible`.

2. Complete assessment → email confirmation → login
   - Expected: login resumes from the next incomplete journey step.
   - Expected: assessment is not repeated.

3. Refresh after assessment
   - Expected: completed assessment state is preserved.
   - Expected: `/assessment` redirects to the next journey step unless opened with `/assessment?retake=true`.

4. Existing active member login
   - Expected: active member with completed first consultation goes to `/patient`.

5. Recovery case
   - Setup: create or find a patient with a `health_assessments` row but missing/stale `patient_journey_state`.
   - Expected: `/api/patient/status` rebuilds journey state with `assessmentStatus = COMPLETED`.
   - Expected: login routes from the recovered state, not back to `/assessment`.
