-- Diagnostic: any row returned here is still a bad global availability uniqueness rule.

SELECT
  'doctor_availability_constraint' AS source,
  c.conname AS name,
  array_agg(a.attname::TEXT ORDER BY a.attname::TEXT) AS columns
FROM pg_constraint c
JOIN unnest(c.conkey) AS key(attnum) ON TRUE
JOIN pg_attribute a
  ON a.attrelid = c.conrelid
 AND a.attnum = key.attnum
WHERE c.conrelid = 'public.doctor_availability'::regclass
  AND c.contype = 'u'
GROUP BY c.conname
HAVING NOT ('doctor_id' = ANY(array_agg(a.attname::TEXT)))
   AND (
     'available_date' = ANY(array_agg(a.attname::TEXT))
     OR 'time_slot' = ANY(array_agg(a.attname::TEXT))
   )

UNION ALL

SELECT
  'doctor_availability_index' AS source,
  i.indexrelid::regclass::text AS name,
  array_agg(a.attname::TEXT ORDER BY a.attname::TEXT) AS columns
FROM pg_index i
LEFT JOIN pg_constraint c ON c.conindid = i.indexrelid
JOIN unnest(string_to_array(i.indkey::text, ' ')::int[]) AS key(attnum) ON TRUE
JOIN pg_attribute a
  ON a.attrelid = i.indrelid
 AND a.attnum = key.attnum
WHERE i.indrelid = 'public.doctor_availability'::regclass
  AND i.indisunique
  AND c.oid IS NULL
GROUP BY i.indexrelid
HAVING NOT ('doctor_id' = ANY(array_agg(a.attname::TEXT)))
   AND (
     'available_date' = ANY(array_agg(a.attname::TEXT))
     OR 'time_slot' = ANY(array_agg(a.attname::TEXT))
   );

-- This second result set should also return zero rows.
SELECT
  'provider_availability_constraint' AS source,
  c.conname AS name,
  array_agg(a.attname::TEXT ORDER BY a.attname::TEXT) AS columns
FROM pg_constraint c
JOIN unnest(c.conkey) AS key(attnum) ON TRUE
JOIN pg_attribute a
  ON a.attrelid = c.conrelid
 AND a.attnum = key.attnum
WHERE c.conrelid = 'public.provider_availability'::regclass
  AND c.contype = 'u'
GROUP BY c.conname
HAVING array_agg(a.attname::TEXT ORDER BY a.attname::TEXT)
  IS DISTINCT FROM ARRAY['available_date', 'provider_id', 'provider_role', 'start_time']::TEXT[]

UNION ALL

SELECT
  'provider_availability_index' AS source,
  i.indexrelid::regclass::text AS name,
  array_agg(a.attname::TEXT ORDER BY a.attname::TEXT) AS columns
FROM pg_index i
LEFT JOIN pg_constraint c ON c.conindid = i.indexrelid
JOIN unnest(string_to_array(i.indkey::text, ' ')::int[]) AS key(attnum) ON TRUE
JOIN pg_attribute a
  ON a.attrelid = i.indrelid
 AND a.attnum = key.attnum
WHERE i.indrelid = 'public.provider_availability'::regclass
  AND i.indisunique
  AND c.oid IS NULL
GROUP BY i.indexrelid
HAVING array_agg(a.attname::TEXT ORDER BY a.attname::TEXT)
  IS DISTINCT FROM ARRAY['available_date', 'provider_id', 'provider_role', 'start_time']::TEXT[];
