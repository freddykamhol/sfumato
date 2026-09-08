export async function sendBookingRequest(payload, request = fetch) {
  const response = await request('/api/requests', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
  const result = await response.json().catch(() => null)
  if (!response.ok || !result?.id) throw new Error(result?.error || 'Deine Anfrage konnte noch nicht übermittelt werden. Deine Eingaben bleiben erhalten. Bitte versuche es erneut.')
  return result
}
