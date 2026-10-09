# 8LIV — Pharmacy Fulfillment Module
## Production-Grade Implementation Prompt for Antigravity

You are working on the existing **8LIV healthcare / weight-management application**.

Your task is to implement and harden the **Pharmacy Fulfillment workflow** end-to-end.

This is the FIRST priority right now.

Do NOT start a broad redesign of unrelated parts of the application.  
Do NOT unnecessarily rewrite existing architecture.  
Do NOT introduce a pharmacy ERP/inventory-management system.

Before changing anything, inspect the existing codebase, database schema, authentication, authorization, tenant architecture, prescription flow, consultation flow, subscription/cycle logic, notification/email infrastructure, and current UI patterns.

Work WITH the existing architecture wherever possible.

---

# 1. CORE BUSINESS MODEL

The pharmacy in 8LIV is a **third-party medicine fulfillment partner**.

It is NOT an inventory-management system.

8LIV does NOT currently need:

- Pharmacy inventory management
- Stock dashboards
- Warehouse management
- Procurement
- Purchase orders
- Medicine catalog management
- Pharmacy internal accounting
- Pharmacy staff-management module
- Stock optimization
- Automatic pharmacy routing
- Service-area algorithms
- Inventory-based pharmacy selection

The pharmacy portal exists only to allow an approved pharmacy to:

1. Receive authorized prescription fulfillment orders
2. Acknowledge them
3. Confirm that they can fulfill them
4. Prepare the order
5. Dispatch the order
6. Provide tracking/courier information
7. Mark the order delivered
8. Report exceptions/clarifications

Keep the pharmacy portal intentionally simple.

---

# 2. CANONICAL 8LIV CLINICAL / COMMERCIAL FLOW

The system must support this conceptual lifecycle:

Patient
→ Assessment
→ Eligibility
→ Paid Initial Consultation ₹499
→ Doctor evaluates patient
→ Patient purchases treatment subscription
→ Treatment Cycle
→ Free follow-up consultation
→ Doctor decides treatment
→ Prescription
→ Pharmacy Order
→ Pharmacy Fulfillment
→ Delivery
→ Next Treatment Cycle
→ Repeat

Important:

- Initial consultation is PAID: ₹499.
- Subsequent monthly follow-up consultations during an active treatment subscription/cycle are FREE.
- Subscription duration is configurable by Admin.
- Do NOT hard-code a particular subscription duration.
- A subscription is an entitlement to the treatment program, not a promise of a fixed quantity of medicine.
- Doctor determines medication/dose each cycle.
- Medication/dose may change between cycles.
- Never automatically generate future prescriptions.
- Never send a complete multi-month medication plan to the pharmacy upfront.
- Pharmacy receives only the currently authorized prescription/order.

---

# 3. PHARMACY RELATIONSHIP / ONBOARDING

There is NO public "Apply as Pharmacy" workflow.

The relationship starts from the 8LIV Admin.

Correct flow:

8LIV Admin
→ Invite Pharmacy
→ Pharmacy receives secure invitation
→ Pharmacy accepts invitation
→ Pharmacy completes onboarding/profile
→ Admin reviews
→ Admin Approves / Rejects / Requests Changes
→ Approved pharmacy becomes VERIFIED
→ Admin activates pharmacy
→ Pharmacy can access portal

Recommended lifecycle:

Invitation:
- INVITED
- ACCEPTED
- EXPIRED
- CANCELLED

Verification:
- PENDING
- UNDER_REVIEW
- VERIFIED
- REJECTED
- EXPIRED

Operational status:
- ACTIVE
- INACTIVE
- SUSPENDED

IMPORTANT:

Accepting an invitation must NOT automatically grant operational access.

A pharmacy must be:

- Authenticated
- Correctly associated with the pharmacy record
- Correct tenant
- VERIFIED
- ACTIVE

before it can operate.

Never rely on frontend route protection alone.

Backend authorization must enforce this.

---

# 4. MULTI-TENANCY IS NON-NEGOTIABLE

This system is multi-tenant.

Every pharmacy-related resource must respect tenant isolation.

Never create a global pharmacy namespace.

Conceptually:

Tenant
 └── partner_pharmacies
      ├── Pharmacy A
      ├── Pharmacy B
      └── Pharmacy C

Different tenants must NEVER be able to access each other's:

- Pharmacies
- Pharmacy users
- Orders
- Prescriptions
- Patients
- Addresses
- Audit logs
- Notifications

Within the same tenant:

Pharmacy A must NEVER be able to access Pharmacy B's orders.

Every API/query/mutation must validate:

1. Authentication
2. User identity
3. Role
4. Tenant membership
5. Pharmacy association where applicable
6. Pharmacy verification status
7. Pharmacy operational status
8. Resource ownership / assignment
9. Permission for the requested action

Do NOT rely on:

- Hidden frontend fields
- URL IDs
- Client-provided tenant IDs
- Client-provided pharmacy IDs
- Client-provided patient IDs
- Client-provided order ownership

to establish authorization.

Prevent IDOR/BOLA vulnerabilities.

Never trust:

`/pharmacy/orders/:id`

just because the user is logged in.

The backend must verify that the authenticated pharmacy user is actually authorized to access that exact order.

---

# 5. MULTIPLE PHARMACIES MUST BE SUPPORTED

Do NOT hard-code a single pharmacy.

Do NOT create something like:

tenant.pharmacy_id

as the only relationship.

Instead, each pharmacy order must reference the pharmacy responsible for fulfillment.

Example:

Prescription
    ↓
Pharmacy Order
    ↓
Assigned Pharmacy

If Pharmacy A becomes suspended:

- Do NOT delete Pharmacy A.
- Do NOT rewrite historical orders.
- Do NOT silently transfer old orders to Pharmacy B.
- Historical orders remain associated with Pharmacy A.
- New orders may be assigned to another eligible pharmacy.
- Existing in-progress orders should remain assigned unless a controlled reassignment mechanism is explicitly implemented later.

Do NOT implement automatic routing/fallback logic in this phase.

However, keep the data model extensible so routing can be added later.

---

# 6. PRESCRIPTION IS THE CLINICAL SOURCE OF TRUTH

Prescription and pharmacy fulfillment order are separate concepts.

Architecture:

Doctor
 ↓
Prescription
 ↓
Pharmacy Order
 ↓
Assigned Pharmacy
 ↓
Fulfillment

A prescription must NOT permanently belong to a pharmacy.

A pharmacy order references the prescription and the selected pharmacy.

Pharmacy users MUST NOT modify clinical prescription data.

They cannot change:

- Medicine
- Strength
- Dose
- Frequency
- Duration
- Quantity
- Route
- Dosage form
- Clinical instructions

They cannot:

- Create prescriptions
- Edit prescriptions
- Increase dosage
- Substitute medication
- Modify clinical instructions

If the doctor changes a dose:

Example:

RX001 → 5 mg

Later:

RX002 → 10 mg

Do NOT mutate RX001.

Preserve prescription history.

Recommended lifecycle:

DRAFT
→ AUTHORIZED
→ ISSUED
→ ACTIVE
→ COMPLETED

Exceptions:

REVOKED
CANCELLED
EXPIRED

Use the existing architecture/enums if already implemented, but enforce the same principles.

An issued/authorized prescription must be immutable.

If a correction is required, use the appropriate revoke/cancel + new prescription workflow.

---

# 7. DELIVERY ADDRESS — IMPORTANT NEW REQUIREMENT

Current patient onboarding may not collect a delivery address.

Do NOT force every patient to enter a delivery address during initial onboarding.

The address should be requested only when it is actually required for pharmacy fulfillment.

The trigger is:

Prescription requiring pharmacy fulfillment is created.

NOT:

Consultation completed.

---

# 8. FIRST-TIME PRESCRIPTION FLOW

After consultation:

Doctor creates/authorizes prescription.

System checks whether the patient has a valid delivery address.

If NO address exists:

Show the patient a clear delivery-address step.

Example UX:

"Delivery address required"

"Your prescription is ready. Please add and confirm your delivery address so we can arrange delivery."

Patient enters:

- Full name / recipient name if required
- Address line
- Apartment / house / building details
- Area/locality
- City
- State
- PIN code
- Contact phone if required

Validate required fields appropriately.

Patient explicitly confirms the address.

Only after confirmation should the pharmacy order be created.

---

# 9. FUTURE PRESCRIPTION FLOW

If the patient already has a saved delivery address:

DO NOT make them enter the entire address again.

Instead show:

"Confirm delivery address"

Display the saved address clearly.

Actions:

- Confirm & Continue
- Change Address

If they select:

Confirm & Continue
→ use that address for the new pharmacy order.

If they select:

Change Address
→ allow them to update/save the new address
→ use the newly confirmed address for this order.

This should be a smooth UX, not a frustrating multi-step process.

---

# 10. IMPORTANT ADDRESS RULE

Patient address and pharmacy order address are different concepts.

Maintain:

Patient saved delivery address
+
Pharmacy order delivery-address snapshot

When creating a pharmacy order:

COPY the confirmed delivery address into an immutable order snapshot.

Example:

Patient currently has:

Address A

Order #PO001 stores:

Address A snapshot

Later patient changes profile address to:

Address B

PO001 MUST STILL SHOW:

Address A

because that is where PO001 was originally intended to be delivered.

This is critical for historical integrity and auditability.

Do not dynamically join an old pharmacy order to the patient's current address.

---

# 11. WHEN NO PHARMACY ORDER IS REQUIRED

If the doctor completes a consultation without issuing a prescription requiring fulfillment:

DO NOT ask the patient for a delivery address.

Simply show the consultation as completed.

The address flow is triggered by actual fulfillment requirement.

---

# 12. PHARMACY ORDER CREATION

A pharmacy order should be created only when:

- Prescription exists
- Prescription is authorized/issued according to the existing state machine
- Prescription is not revoked/cancelled/expired
- Patient is eligible for fulfillment
- Delivery address is confirmed
- An eligible pharmacy is assigned
- Tenant context is valid

The order should reference:

- tenant_id
- patient_id
- prescription_id
- pharmacy_id
- treatment_cycle_id where applicable
- delivery-address snapshot
- relevant fulfillment information
- timestamps
- current order status

Use foreign keys and database constraints wherever appropriate.

Prevent duplicate orders for the same prescription unless an explicit controlled replacement/reissue workflow exists.

Use idempotency for order creation.

---

# 13. PHARMACY ORDER STATE MACHINE

Use a clear fulfillment lifecycle.

Primary flow:

RECEIVED
→ ACKNOWLEDGED
→ STOCK_CONFIRMED
→ PREPARING
→ DISPATCHED
→ DELIVERED

Exceptions:

CLARIFICATION_REQUIRED
UNABLE_TO_FULFILL
PARTIALLY_FULFILLED
CANCELLED

Do not allow arbitrary status changes.

Define valid transitions.

For example:

RECEIVED
→ ACKNOWLEDGED

ACKNOWLEDGED
→ STOCK_CONFIRMED
→ CLARIFICATION_REQUIRED
→ UNABLE_TO_FULFILL

STOCK_CONFIRMED
→ PREPARING
→ CLARIFICATION_REQUIRED
→ UNABLE_TO_FULFILL

PREPARING
→ DISPATCHED
→ UNABLE_TO_FULFILL

DISPATCHED
→ DELIVERED

Prevent:

DELIVERED → PREPARING

or other invalid backwards transitions.

If an exception requires reopening/reassignment, do it through an explicit controlled backend operation rather than arbitrary status editing.

---

# 14. PHARMACY PORTAL UX

The pharmacy portal should feel like a clean fulfillment dashboard.

NOT an ERP.

Dashboard can show:

- New Orders
- Acknowledged
- Preparing
- Dispatched
- Delivered
- Exceptions

Keep the UI simple, professional and operationally clear.

Order detail should show only the minimum information required for fulfillment.

Include where appropriate:

- Order ID
- Prescription ID
- Patient name/identity needed for fulfillment
- Delivery address
- Required contact phone
- Prescription date
- Treatment cycle
- Medicine
- Strength
- Dosage form
- Route
- Dose
- Frequency
- Quantity
- Duration
- Instructions
- Doctor name
- Doctor registration number if required operationally

Do NOT expose unrelated patient medical information.

Use minimum-necessary data.

---

# 15. PHARMACY ACTIONS

Depending on state, pharmacy should be able to:

- Acknowledge order
- Confirm fulfillment/availability
- Start preparing
- Dispatch
- Add courier/tracking/AWB information
- Mark delivered
- Request clarification
- Report unable to fulfill

These actions must be backend-authorized.

Frontend buttons are NOT security controls.

The backend must validate the state transition every time.

---

# 16. PHARMACY MUST NOT MODIFY CLINICAL DATA

Explicitly prevent pharmacy users from modifying:

- Prescription
- Medicine
- Strength
- Dose
- Frequency
- Duration
- Quantity
- Clinical instructions
- Doctor information
- Treatment plan

If pharmacy has an issue:

Use:

"Request Clarification"

or

"Unable to Fulfill"

Then the appropriate 8LIV/doctor workflow handles it.

Never allow a pharmacy to solve a clinical issue by editing the prescription.

---

# 17. PATIENT EXPERIENCE

Patient should have a clear view of their fulfillment status.

Example:

Prescription Issued
↓
Address Confirmed
↓
Order Sent to Pharmacy
↓
Pharmacy Acknowledged
↓
Preparing
↓
Dispatched
↓
Out for Delivery / Tracking if available
↓
Delivered

Make this visually understandable.

Use:

- Status badges
- Timeline
- Clear timestamps
- Human-readable descriptions
- Appropriate empty states
- Loading states
- Error states
- Success feedback

Avoid overwhelming patients with internal technical statuses.

For example:

Internal:
STOCK_CONFIRMED

Patient-facing:
"Pharmacy confirmed your order."

Internal:
PREPARING

Patient-facing:
"Your medicine is being prepared."

---

# 18. NOTIFICATIONS

Use the existing notification/email infrastructure.

Do NOT replace APIs with email.

Correct architecture:

Frontend
→ API
→ Database / business logic
→ Domain event
→ Notification service
→ Existing SMTP/email infrastructure

Notifications should be generated for important events.

At minimum:

- Prescription issued
- Pharmacy order created
- Pharmacy acknowledged
- Fulfillment confirmed
- Preparing
- Dispatched
- Tracking available
- Delivered
- Clarification required
- Unable to fulfill
- Prescription revoked where relevant
- Medication review requested/completed where applicable

Notifications must be idempotent.

Do not send duplicate notifications because the same API request was retried.

SMTP failure must NOT roll back the underlying database transaction.

Database/business state is the source of truth.

---

# 19. PRIVACY-SAFE NOTIFICATIONS

Do NOT put unnecessary health information into email/SMS.

Avoid:

"Your 10 mg [medicine name] prescription for [condition] has been dispatched..."

Prefer:

"Your medication order has been dispatched. Sign in to your secure 8LIV account to view details."

Do not put sensitive prescription data into:

- Public URLs
- Query parameters
- Email subject lines unnecessarily
- Notification previews unnecessarily

Use secure authenticated application pages for detailed information.

---

# 20. AUDIT LOGGING

Important pharmacy actions must be auditable.

Log events such as:

- Pharmacy invitation
- Invitation accepted
- Pharmacy onboarding submitted
- Verification
- Approval
- Rejection
- Activation
- Suspension
- Pharmacy login/access events where appropriate
- Order creation
- Order acknowledgement
- Fulfillment confirmation
- Preparation
- Dispatch
- Tracking update
- Delivery
- Clarification request
- Unable to fulfill
- Cancellation
- Reassignment if ever supported
- Prescription-related fulfillment events

Audit entries should contain appropriate:

- tenant_id
- actor/user ID
- actor role
- pharmacy ID where relevant
- resource/order ID
- action
- timestamp
- relevant before/after state where appropriate
- request/event correlation ID if existing infrastructure supports it

Never log secrets, passwords, tokens, or unnecessary sensitive medical information.

---

# 21. AUTHORIZATION MATRIX

Implement and verify strict role boundaries.

PATIENT:

Can:
- View own prescriptions
- Add/update own delivery address
- Confirm own delivery address
- View own pharmacy orders
- View own fulfillment status

Cannot:
- View another patient's data
- Modify prescriptions
- Modify pharmacy order status
- Access pharmacy portal

DOCTOR:

Can:
- View assigned patients according to existing authorization
- Create prescriptions
- Authorize prescriptions
- Revoke/cancel according to clinical workflow
- Trigger fulfillment through valid prescription workflow

Cannot:
- Access unrelated tenants
- Access unrelated patients
- Arbitrarily edit pharmacy fulfillment status unless explicitly authorized by business workflow

PHARMACY:

Can:
- View orders assigned to its own pharmacy
- View minimum necessary fulfillment information
- Update fulfillment status within valid transitions
- Add tracking/courier information
- Request clarification
- Report inability to fulfill

Cannot:
- View other pharmacies' orders
- View unrelated patients
- Edit prescriptions
- Create prescriptions
- Change clinical data
- Access another tenant

ADMIN:

Can:
- Manage pharmacies
- Invite pharmacies
- Review onboarding
- Approve/reject
- Activate/deactivate/suspend
- View operational fulfillment information according to existing admin permissions
- Audit activity

But even Admin operations must respect tenant boundaries unless the existing platform has a deliberately privileged global-super-admin role.

Do not accidentally create cross-tenant admin access.

---

# 22. RLS / DATABASE SECURITY

If the project uses Row Level Security:

Review every relevant table and policy.

At minimum verify:

- Tenant isolation
- Patient isolation
- Doctor assignment boundaries
- Pharmacy isolation
- Pharmacy-user isolation
- Pharmacy-order isolation
- Prescription isolation
- Address isolation
- Audit-log access restrictions

Do not assume RLS is correct because a policy exists.

Test actual authenticated access.

Attempt negative cases such as:

Pharmacy A → Pharmacy B order
Patient A → Patient B order
Tenant A → Tenant B order
Pharmacy → unrelated prescription
Patient → another patient's address
Doctor → unrelated tenant

All must fail.

Also ensure service-role/backend access is carefully controlled.

---

# 23. DELIVERY ADDRESS SECURITY

Treat addresses as sensitive personal data.

Requirements:

- Only authorized patient/user can modify their address.
- Pharmacy only receives the address for assigned fulfillment.
- Other pharmacies cannot access it.
- Other patients cannot access it.
- Old order address snapshots remain protected.
- Do not expose addresses through predictable public URLs.
- Do not return addresses from unrelated API endpoints.
- Validate and sanitize address inputs.
- Do not trust client-provided patient IDs.

Use server-side identity from the authenticated session.

---

# 24. SUBSCRIPTION / CYCLE RELATIONSHIP

The pharmacy order belongs to a specific treatment cycle where applicable.

Example:

Subscription
→ Cycle 1
→ Prescription RX001
→ Pharmacy Order PO001

Cycle 2
→ Prescription RX002
→ Pharmacy Order PO002

Cycle 3
→ Prescription RX003
→ Pharmacy Order PO003

Never create one giant pharmacy order for a 10-month subscription.

Each cycle is independently fulfilled.

A new cycle may have:

- Same medicine
- Different dose
- Different medicine
- No prescription
- Different fulfillment outcome

The system must support this naturally.

---

# 25. IMPORTANT: CONSULTATION + PRESCRIPTION LOGIC

Do not assume every consultation generates a pharmacy order.

Doctor may:

A) Complete consultation without prescribing
→ Consultation completed
→ No address request
→ No pharmacy order

OR

B) Complete consultation and prescribe
→ Prescription authorized
→ Address check
→ Address confirmation if required
→ Pharmacy order

The address requirement must be tied to actual fulfillment.

---

# 26. EXISTING AUTHENTICATION

Reuse the existing authentication system.

Do NOT create a second independent authentication mechanism for pharmacies unless the current architecture absolutely requires it.

Pharmacy users should have:

- User identity
- Pharmacy association
- Role
- Tenant association
- Account status

Backend authorization must verify all of these.

Credentials alone must NOT grant pharmacy access.

---

# 27. UI/UX QUALITY REQUIREMENTS

Although pharmacy functionality is the current priority, the implementation MUST NOT create poor UX.

Follow the application's existing design system.

Do NOT introduce:

- Random colors
- Inconsistent spacing
- Huge empty areas
- Overcrowded cards
- Excessive modals
- Confusing technical terminology
- Tiny touch targets
- Broken mobile layouts
- Desktop-only interactions
- Layout shifts
- Unnecessary forms

Ensure:

### Desktop
- Clear hierarchy
- Efficient order table
- Good use of whitespace
- Easy status scanning
- Clear primary actions

### Mobile
- Responsive order cards
- No horizontal overflow
- Touch-friendly controls
- Important information visible without excessive scrolling
- Status/action hierarchy remains clear

### Patient UI
Should feel calm, trustworthy and simple.

### Pharmacy UI
Should feel operational, fast and clear.

Use existing 8LIV components/design tokens wherever possible.

Do not redesign the entire application during this task.

---

# 28. ERROR HANDLING

Handle real-world failures properly.

Examples:

- Pharmacy suspended
- Pharmacy inactive
- Prescription revoked
- Prescription expired
- Address missing
- Address invalid
- Pharmacy unavailable
- Duplicate order creation
- Network retry
- Concurrent status update
- Notification failure
- Unauthorized access
- Invalid status transition

Never show raw database/server errors to users.

Return useful user-facing messages.

Example:

Instead of:

"Foreign key constraint failed"

show:

"We couldn't create the medication order right now. Please try again."

Log technical details securely for developers/monitoring.

---

# 29. CONCURRENCY / IDEMPOTENCY

This is important.

Prevent duplicate fulfillment orders when:

- Patient refreshes
- User double-clicks
- API retries
- Payment/consultation callback repeats
- Webhook repeats
- Background event retries

Use appropriate:

- Unique constraints
- Idempotency keys
- Transactions
- Atomic state transitions
- Server-side validation

Where appropriate.

Two simultaneous requests must NOT create two fulfillment orders for the same prescription unintentionally.

---

# 30. NO CLIENT-SIDE BUSINESS AUTHORITY

Never trust client values for:

- tenant_id
- patient_id
- pharmacy_id
- doctor_id
- prescription ownership
- order ownership
- price
- order status
- prescription status

Derive authoritative identity/context from:

- authenticated session
- server-side relationships
- database
- validated state machine

The client should request an action.

The backend decides whether the action is permitted.

---

# 31. DO NOT BREAK EXISTING FEATURES

Before implementation:

Inspect existing:

- Database schema
- Migrations
- API routes
- Services
- Auth
- Middleware
- RLS
- Prescription implementation
- Consultation implementation
- Subscription implementation
- Treatment cycle implementation
- Notification/email implementation
- Existing UI components
- Existing design system

Identify what already exists.

Reuse existing models/components/services where correct.

Do not duplicate functionality.

Do not create parallel versions of:

- Auth
- Users
- Notifications
- Email
- Tenant handling
- Prescription service
- Audit system

---

# 32. IMPLEMENTATION APPROACH

Work in phases.

## Phase 1 — Audit existing implementation

Inspect the repository and document:

- Existing relevant tables
- Existing pharmacy code
- Existing prescription code
- Existing patient profile/address model
- Existing auth/RBAC
- Existing tenant architecture
- Existing RLS
- Existing notifications
- Existing email/SMTP
- Existing UI components

Do NOT modify anything yet.

Identify exactly what must be added/changed.

## Phase 2 — Database / domain model

Implement or modify:

- partner_pharmacies
- partner_pharmacy_users
- pharmacy_orders
- delivery address model if missing
- order address snapshot
- audit events
- notification events

Use existing conventions.

Add indexes and constraints.

Ensure tenant_id exists wherever required.

## Phase 3 — Pharmacy onboarding

Implement:

Admin invitation
→ secure invitation
→ pharmacy acceptance
→ onboarding
→ admin review
→ verification
→ activation

Do not auto-activate.

## Phase 4 — Prescription → Fulfillment

Implement:

Authorized prescription
→ delivery-address check
→ first-time address collection OR existing-address confirmation
→ pharmacy order
→ assigned pharmacy

Do not create the order before required address confirmation.

## Phase 5 — Pharmacy portal

Implement:

Dashboard
→ Order list
→ Order details
→ Valid fulfillment actions
→ Tracking
→ Exceptions

Keep it simple.

## Phase 6 — Patient fulfillment UI

Implement:

- Add address
- Confirm existing address
- Change address
- Order status
- Fulfillment timeline
- Delivery information

## Phase 7 — Notifications

Connect to existing notification/email service.

Implement event-driven, idempotent notifications.

## Phase 8 — Security hardening

Perform:

- RBAC testing
- tenant isolation testing
- IDOR/BOLA testing
- RLS testing
- prescription immutability testing
- pharmacy isolation testing
- address isolation testing
- state transition testing
- duplicate-order testing

## Phase 9 — UX polish

Review:

- desktop
- tablet
- mobile
- loading
- empty
- error
- success
- accessibility
- responsive layout

Do not redesign unrelated screens.

---

# 33. TESTING REQUIREMENTS

Do not stop after "it works in the UI."

Create/execute tests for:

### Authentication
- Unauthenticated user denied
- Pharmacy inactive denied
- Pharmacy unverified denied

### Tenant isolation
- Tenant A cannot access Tenant B

### Pharmacy isolation
- Pharmacy A cannot access Pharmacy B orders

### Patient isolation
- Patient A cannot access Patient B

### Prescription security
- Pharmacy cannot edit prescription
- Patient cannot edit prescription
- Issued prescription cannot be mutated

### Address security
- Patient can edit own address
- Patient cannot edit another patient's address
- Pharmacy sees only assigned order address

### Order lifecycle
- Valid transitions succeed
- Invalid transitions fail

### Duplicate prevention
- Same prescription cannot unintentionally generate duplicate orders

### Address workflow
Test:

Case 1:
Prescription + no address
→ address prompt
→ address confirmed
→ order created

Case 2:
Prescription + saved address
→ confirmation screen
→ confirm
→ order created

Case 3:
Prescription + saved address
→ change address
→ new address confirmed
→ order created with new snapshot

Case 4:
Consultation without prescription
→ no address prompt
→ no pharmacy order

Case 5:
Old order + patient changes address
→ old order retains old address

### Pharmacy suspension
- Existing historical orders remain intact
- Suspended pharmacy cannot perform new fulfillment actions
- New order assignment can use another eligible pharmacy

---

# 34. SECURITY REVIEW

After implementation, actively search the codebase for:

- IDOR
- BOLA
- Missing tenant filters
- Missing RLS
- Client-controlled IDs
- Client-controlled status
- Client-controlled ownership
- Privilege escalation
- Pharmacy cross-access
- Patient cross-access
- Prescription mutation
- Unauthorized address access
- Insecure public URLs
- Sensitive data leakage
- Hard-coded secrets
- Unsafe logging
- Missing rate limits where relevant
- Duplicate order creation
- Race conditions
- Invalid state transitions

Security is more important than UI convenience.

---

# 35. IMPORTANT LEGAL / BUSINESS BOUNDARY

Do NOT invent a medicine payment/accounting model.

Do not automatically implement:

- 8LIV medicine payment collection
- Pharmacy payment settlement
- Doctor revenue split
- Marketplace commission
- Pharmacy invoice ownership
- Medicine tax/accounting logic

unless the existing business requirements/code explicitly define them.

The pharmacy is currently a fulfillment partner.

Keep the architecture flexible for future commercial/payment integration.

---

# 36. FINAL USER EXPERIENCE

The intended real-world experience should be:

### First prescription

Doctor consultation
→ Doctor prescribes
→ Prescription authorized
→ Patient sees:

"Your prescription is ready."

→ "Add delivery address"
→ Patient enters address
→ "Confirm & Continue"
→ Pharmacy order created
→ Patient sees:

"Order sent to pharmacy."

→ Pharmacy acknowledges
→ Preparing
→ Dispatched
→ Delivered

### Next prescription

Doctor consultation
→ Doctor prescribes
→ Prescription authorized
→ System finds saved address
→ Patient sees:

"Confirm delivery address"

[Saved address]

[Confirm & Continue]
[Change Address]

→ Patient confirms
→ Pharmacy order created
→ Same fulfillment flow

### Consultation with no prescription

Doctor completes consultation
→ Consultation marked complete
→ No address prompt
→ No pharmacy order

This is the target experience.

---

# 37. IMPORTANT IMPLEMENTATION PRINCIPLES

Prioritize in this exact order:

1. SECURITY
2. MULTI-TENANT ISOLATION
3. DATA INTEGRITY
4. AUTHORIZATION
5. PRESCRIPTION IMMUTABILITY
6. ORDER STATE-MACHINE CORRECTNESS
7. ADDRESS / FULFILLMENT CORRECTNESS
8. NOTIFICATION RELIABILITY
9. UX/UI QUALITY
10. PERFORMANCE

Do NOT sacrifice security for convenience.

Do NOT sacrifice data integrity for UX.

Do NOT expose sensitive clinical data unnecessarily.

Do NOT create an over-engineered pharmacy ERP.

Do NOT redesign unrelated parts of 8LIV.

---

# 38. FINAL VERIFICATION REPORT

After implementation, provide a detailed report containing:

## A. Existing Architecture Found
What already existed and was reused.

## B. Files Changed
List every modified/created file.

## C. Database Changes
List:
- Tables
- Columns
- Constraints
- Indexes
- RLS policies
- Migrations

## D. API Changes
List:
- New endpoints
- Modified endpoints
- Authorization rules

## E. Pharmacy Workflow
Explain the complete end-to-end workflow.

## F. Address Workflow
Explicitly verify:
- First-time address
- Existing-address confirmation
- Change address
- Address snapshot
- No-address/no-prescription behavior

## G. Security Verification
Report results for:
- Tenant isolation
- Pharmacy isolation
- Patient isolation
- Prescription immutability
- IDOR/BOLA
- RLS
- Role authorization

## H. Order State Machine
List every valid transition and invalid-transition protection.

## I. Notifications
List events and idempotency behavior.

## J. UX Verification
Report:
- Desktop
- Tablet
- Mobile
- Loading
- Empty
- Error
- Success
- Accessibility

## K. Tests
Run relevant:
- Unit tests
- Integration tests
- RLS/security tests
- API tests
- Build
- TypeScript
- Lint

Do not claim a test passed unless it was actually run.

## L. Remaining Risks
Clearly state anything that still requires manual/legal/business confirmation.

---

# 39. DEFINITION OF DONE

This task is DONE only when:

- Multiple pharmacies are supported
- Pharmacy onboarding is invitation-based
- Pharmacy is not auto-verified/activated
- Pharmacy access is strictly authorized
- Multi-tenancy is enforced everywhere
- Pharmacy A cannot access Pharmacy B
- Patients cannot access other patients
- Prescriptions are immutable after issuance
- Pharmacy cannot modify clinical data
- Pharmacy order is separate from prescription
- Pharmacy receives only the current cycle's authorized fulfillment
- First-time patients are prompted for an address only when fulfillment requires it
- Existing patients confirm their saved address
- Patients can change their address
- Order stores an address snapshot
- Consultation without prescription does not request an address
- Pharmacy order state transitions are enforced server-side
- Duplicate order creation is prevented
- Notifications are event-driven and idempotent
- SMTP failure does not corrupt business state
- Audit logging exists
- Sensitive data is minimized
- Desktop UX is polished
- Mobile UX is polished
- No unrelated application redesign is introduced
- Security tests pass
- TypeScript/lint/build pass
- Existing functionality remains intact

IMPORTANT:

Do not merely implement the happy path.

Think like a production security engineer, backend architect, clinical workflow designer, and UX engineer simultaneously.

Inspect first.
Plan second.
Implement incrementally.
Test aggressively.
Then provide the final verification report.