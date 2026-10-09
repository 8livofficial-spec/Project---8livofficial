-- ==============================================================================
-- 8LIV CRITICAL FIX: Eliminate Infinite Recursion in public.profiles and is_admin()
-- ==============================================================================
-- Problem: PostgREST returns 500 error 42P17: "infinite recursion detected in policy for relation 'profiles'".
-- Root Cause: public.is_admin() ran `SELECT 1 FROM public.profiles...`, while
--             the policy "Admins can view all profiles" on public.profiles invoked public.is_admin().
-- Solution:
--   1. Redefine public.is_admin() to inspect auth.jwt() claims without querying tables.
--   2. Drop the recursive policy from public.profiles.
--   3. Ensure strict, non-recursive RLS policies on public.profiles and partner_pharmacy_users.
-- ==============================================================================

-- 1. Redefine is_admin() safely using JWT claims (O(1), zero table queries, zero recursion)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (
    COALESCE(auth.jwt() ->> 'email', '') = '8livofficial@gmail.com'
    OR COALESCE(auth.jwt() -> 'user_metadata' ->> 'role', '') ILIKE 'admin'
    OR COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', '') ILIKE 'admin'
  );
END;
$$;

-- 2. Drop recursive policy on public.profiles
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

-- 3. Ensure Patients can view and update their own profile cleanly
DROP POLICY IF EXISTS "Patients can view own profile" ON public.profiles;
CREATE POLICY "Patients can view own profile"
  ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Patients can update own profile" ON public.profiles;
CREATE POLICY "Patients can update own profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 4. Service role has full access (Next.js backend uses service_role for all admin operations)
DROP POLICY IF EXISTS "Service role manages all profiles" ON public.profiles;
CREATE POLICY "Service role manages all profiles"
  ON public.profiles FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- 5. Fix partner_pharmacy_users policy to avoid recursive profile lookups
DROP POLICY IF EXISTS "pharmacy users view own membership" ON public.partner_pharmacy_users;
CREATE POLICY "pharmacy users view own membership"
  ON public.partner_pharmacy_users FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

-- 6. Notify PostgREST to immediately refresh its schema cache
NOTIFY pgrst, 'reload schema';
