const memoryStore = new Map()

export const memoryStorage = {
  getItem: (key) => memoryStore.get(key) ?? null,
  setItem: (key, value) => {
    memoryStore.set(key, String(value))
  },
  removeItem: (key) => {
    memoryStore.delete(key)
  },
  clear: () => {
    memoryStore.clear()
  },
}

export function getSafeStorage() {
  if (typeof window === 'undefined') {
    return memoryStorage
  }
  try {
    const testKey = '__bf_storage_test__'
    window.localStorage.setItem(testKey, testKey)
    window.localStorage.removeItem(testKey)
    return window.localStorage
  } catch {
    return memoryStorage
  }
}

export function getStorageItem(key) {
  try {
    return getSafeStorage().getItem(key)
  } catch {
    return memoryStorage.getItem(key)
  }
}

export function setStorageItem(key, value) {
  try {
    getSafeStorage().setItem(key, typeof value === 'string' ? value : JSON.stringify(value))
  } catch {
    memoryStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value))
  }
}

export function removeStorageItem(key) {
  try {
    getSafeStorage().removeItem(key)
  } catch {
    memoryStorage.removeItem(key)
  }
}

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

