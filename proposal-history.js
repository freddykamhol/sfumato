const phoneKey = value => String(value || '').replace(/\D/g, '').replace(/^0049/, '49').replace(/^0/, '49')
export function previouslyProposedSlots(entry, requests = []) {
  const email = String(entry?.email || '').trim().toLowerCase(), phone = phoneKey(entry?.phone)
  const related = [entry, ...requests.filter(item => item.id !== entry?.id && ((email && String(item.email || '').trim().toLowerCase() === email) || (phone && phoneKey(item.phone) === phone)))]
  return new Set(related.filter(Boolean).flatMap(item => [...(item.proposedSlotHistory || []), ...(item.proposals || []).flatMap(batch => batch.slots || [])]).map(value => new Date(value).getTime()).filter(Number.isFinite))
}
