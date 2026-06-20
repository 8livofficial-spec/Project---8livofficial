-- Database-driven appointment availability queries.
-- Run after fix_provider_availability_scalability.sql.

CREATE OR REPLACE FUNCTION public.get_available_appointment_dates(
  p_provider_role TEXT,
  p_provider_id UUID DEFAULT NULL
)
RETURNS TABLE (
  available_date DATE,
  available_count BIGINT
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    availability.available_date,
    COUNT(*) AS available_count
  FROM public.provider_availability AS availability
  JOIN public.provider_profiles AS provider
    ON provider.provider_id = availability.provider_id
   AND provider.status = 'active'
  WHERE availability.provider_role = lower(p_provider_role)
    AND availability.status = 'AVAILABLE'
    AND availability.is_available = TRUE
    AND (p_provider_id IS NULL OR availability.provider_id = p_provider_id)
    AND availability.available_date >= (NOW() AT TIME ZONE 'Asia/Kolkata')::date
    AND (
      availability.available_date > (NOW() AT TIME ZONE 'Asia/Kolkata')::date
      OR (
        availability.available_date = (NOW() AT TIME ZONE 'Asia/Kolkata')::date
        AND availability.start_time > (NOW() AT TIME ZONE 'Asia/Kolkata')::time
      )
    )
  GROUP BY availability.available_date
  ORDER BY availability.available_date;
$$;

CREATE OR REPLACE FUNCTION public.get_available_appointment_slots(
  p_provider_role TEXT,
  p_available_date DATE,
  p_provider_id UUID DEFAULT NULL
)
RETURNS TABLE (
  slot_id UUID,
  provider_id UUID,
  provider_role TEXT,
  available_date DATE,
  start_time TIME,
  end_time TIME,
  slot_duration INTEGER,
  slot_status TEXT,
  slot_source TEXT
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    availability.id,
    availability.provider_id,
    availability.provider_role,
    availability.available_date,
    availability.start_time,
    availability.end_time,
    availability.slot_duration,
    availability.status,
    availability.source
  FROM public.provider_availability AS availability
  JOIN public.provider_profiles AS provider
    ON provider.provider_id = availability.provider_id
   AND provider.status = 'active'
  WHERE availability.provider_role = lower(p_provider_role)
    AND availability.available_date = p_available_date
    AND availability.status = 'AVAILABLE'
    AND availability.is_available = TRUE
    AND (p_provider_id IS NULL OR availability.provider_id = p_provider_id)
    AND availability.available_date >= (NOW() AT TIME ZONE 'Asia/Kolkata')::date
    AND (
      availability.available_date > (NOW() AT TIME ZONE 'Asia/Kolkata')::date
      OR (
        availability.available_date = (NOW() AT TIME ZONE 'Asia/Kolkata')::date
        AND availability.start_time > (NOW() AT TIME ZONE 'Asia/Kolkata')::time
      )
    )
  ORDER BY availability.start_time, availability.provider_id;
$$;

REVOKE ALL ON FUNCTION public.get_available_appointment_dates(TEXT, UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_available_appointment_slots(TEXT, DATE, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_available_appointment_dates(TEXT, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_available_appointment_slots(TEXT, DATE, UUID) TO service_role;

NOTIFY pgrst, 'reload schema';
