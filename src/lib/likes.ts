const VOTER_ID_KEY = 'open-metropolitan-voter-id'
let fallbackVoterId: string | null = null

export function getVoterId() {
  try {
    const existing = window.localStorage.getItem(VOTER_ID_KEY)
    if (existing) return existing

    const voterId = crypto.randomUUID()
    window.localStorage.setItem(VOTER_ID_KEY, voterId)
    return voterId
  } catch {
    fallbackVoterId ??= crypto.randomUUID()
    return fallbackVoterId
  }
}
