export function ilikePattern(value: unknown) {
  const text = String(value || '')
    .trim()
    .replace(/[,%()]/g, ' ')
    .replace(/\s+/g, ' ')
    .slice(0, 80)

  return text ? `%${text}%` : ''
}

export function patientSearchOrFilter(search: unknown, includeEmail = true) {
  const pattern = ilikePattern(search)
  if (!pattern) return ''

  const fields = includeEmail
    ? ['first_name', 'last_name', 'email', 'phone_number']
    : ['first_name', 'last_name', 'phone_number']

  return fields.map((field) => `${field}.ilike.${pattern}`).join(',')
}
