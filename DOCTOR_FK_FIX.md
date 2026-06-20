# Fix: Doctor Availability Foreign Key Constraint Error

## Problem
When trying to add availability slots in the doctor portal, you get the error:
```
Error: insert or update on table "doctor_availability" violates foreign key constraint "doctor_availability_doctor_id_fkey"
```

## Root Cause Analysis

The issue occurs because:

1. **Missing `profiles` table entry**: The `doctor_availability` table has a foreign key constraint that requires each `doctor_id` to exist in the `public.profiles` table.

2. **Doctor creation only creates partial records**: When a doctor is created via `create_doctor.py`, it only creates:
   - An entry in `auth.users` (handled by Supabase Auth)
   - An entry in `doctor_profiles` table
   - An entry in `doctor_wallet` table
   
   But it does NOT create an entry in the `profiles` table.

3. **Timing issue**: When the doctor tries to insert an availability slot with `doctor_id: doctor.id` (which is the auth.user.id), the database rejects it because there's no matching record in the `profiles` table.

## Solution

The fix involves three layers:

### Layer 1: Frontend Auto-Recovery (Doctor Dashboard)
**File**: `frontend/app/doctor/dashboard/page.tsx`

When the doctor logs in, the dashboard now:
1. Checks if a `profiles` entry exists for the doctor
2. Auto-creates one if missing (with role='doctor')
3. This ensures the FK constraint is satisfied

```typescript
// Ensure doctor profile exists in profiles table
const { data: profilesEntry } = await supabase
  .from('profiles')
  .select('*')
  .eq('id', session.user.id)
  .maybeSingle();

if (!profilesEntry) {
  const { error: profilesInsertErr } = await supabase
    .from('profiles')
    .upsert({
      id: session.user.id,
      role: 'doctor',
      first_name: userProfile?.first_name || 'Dr',
      last_name: userProfile?.last_name || 'Unknown',
      email: session.user.email || ''
    });
}
```

### Layer 2: Improved Slot Addition
**File**: `frontend/app/doctor/dashboard/page.tsx` - `addSlot()` function

Before inserting a slot, the code now:
1. Verifies the doctor exists in the `profiles` table
2. Auto-creates the profile if missing
3. Provides better error messages

```typescript
// Verify doctor exists in profiles table (FK requirement)
const { data: profileExists } = await supabase
  .from('profiles')
  .select('id')
  .eq('id', doctor.id)
  .maybeSingle();

if (!profileExists) {
  const { error: createErr } = await supabase
    .from('profiles')
    .upsert({
      id: doctor.id,
      role: 'doctor',
      email: doctor.email || ''
    });
}
```

### Layer 3: Improved Doctor Creation
**File**: `Backend/create_doctor.py`

When creating a new doctor via the script:
1. Creates the `profiles` entry (role='doctor')
2. Creates the `doctor_profiles` entry
3. Creates the `doctor_wallet` entry
4. Ensures all prerequisites are in place

```python
# Check if profiles entry exists (required for foreign key constraints)
profiles_check = supabase.from_("profiles").select("*").eq("id", user.id).execute()
if not profiles_check.data:
    print("Creating profiles entry...")
    supabase.from_("profiles").upsert({
        "id": user.id,
        "role": "doctor",
        ...
    }).execute()
```

## Implementation Steps

### Quick Fix (Immediate)

1. **Update doctor dashboard** (already done):
   - Run your frontend build to pick up the new auto-recovery code
   - Next time a doctor logs in, their `profiles` entry will be created automatically

2. **Update doctor creation script** (already done):
   - For any new doctors, run the updated `create_doctor.py`

### Permanent Fix (Database)

1. **Run the SQL migration** in Supabase SQL editor:
   ```bash
   # Copy the entire contents of Database/fix_doctor_availability_fk.sql
   # and paste into Supabase SQL editor, then execute
   ```
   
   This script:
   - Ensures `doctor_availability` table exists with correct FK
   - Creates proper indexes
   - Sets up RLS policies
   - Auto-creates missing `profiles` entries for existing doctors
   - Validates data integrity

## Data Integrity Check

After applying the fix, verify by running in Supabase SQL editor:

```sql
-- Should show all doctors
SELECT COUNT(*) FROM public.profiles WHERE role = 'doctor';

-- Should show all availability slots
SELECT COUNT(*) FROM public.doctor_availability;

-- Should show 0 orphaned records (critical!)
SELECT COUNT(*) 
FROM public.doctor_availability da
WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = da.doctor_id);
```

## Test Steps

1. **For Existing Doctors**:
   - Go to doctor portal
   - Go to Availability tab
   - Try to add a slot
   - Should now work without FK constraint error

2. **For New Doctors**:
   - Run `python create_doctor.py` with updated script
   - New doctor can immediately add slots

## Why This Happened

- The schema was created without ensuring all required `profiles` entries for doctors
- The doctor creation flow didn't complete all prerequisites
- The dashboard didn't validate FK constraints before insertion

## Prevention

Going forward:

1. ✅ Frontend auto-creates missing `profiles` entries
2. ✅ `create_doctor.py` now creates all required entries
3. ✅ SQL migration ensures database-level integrity
4. ✅ Better error messages help diagnose future issues

## Rollback (If Needed)

The changes are non-destructive:
- Added validation checks (no harm if already correct)
- Auto-create logic is idempotent (safe to run multiple times)
- No data deletion or modification

If you need to revert:
- Simply use the previous frontend version
- Old code will still work, just won't have auto-recovery

## Support

If you still see the FK error after applying these fixes:

1. Check Supabase > Authentication > Users for the doctor user
2. Check Supabase > Table Editor > `profiles` table for the doctor entry
3. Run the diagnostic query above to verify data integrity
4. Check browser console for detailed error messages

---

**Files Modified:**
- ✅ `frontend/app/doctor/dashboard/page.tsx` - Added profile auto-creation and validation
- ✅ `Backend/create_doctor.py` - Added profiles table creation
- ✅ `Database/fix_doctor_availability_fk.sql` - Database schema fix (NEW)

**Status**: Ready for deployment
