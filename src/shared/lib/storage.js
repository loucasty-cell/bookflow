export function safeParse(value, fallback) {
  try {
    return value ? JSON.parse(value) : fallback
  } catch {
    return fallback
  }
}

export function documentStorageKey(id) {
  return `bookflow:document:${id}`
}
