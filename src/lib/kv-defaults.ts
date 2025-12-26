import { KV_DEFAULTS, REQUIRED_KV_KEYS, cloneDefaultValue } from '../../kv-defaults.mjs'

export { KV_DEFAULTS, REQUIRED_KV_KEYS }

export type KvKey = keyof typeof KV_DEFAULTS

export function getDefaultValue(key: string) {
  return cloneDefaultValue(key)
}

export function missingRequiredKeys(existingKeys: string[] = []) {
  return REQUIRED_KV_KEYS.filter((key) => !existingKeys.includes(key))
}

export async function ensureClientKvDefaults() {
  try {
    if (typeof window === 'undefined' || !window.spark?.kv) {
      return { available: false, missing: REQUIRED_KV_KEYS, seeded: [] as string[] }
    }

    const keys = (await window.spark.kv.keys()) ?? []
    const missing = missingRequiredKeys(keys)
    const seeded: string[] = []

    for (const key of missing) {
      const defaultValue = getDefaultValue(key)
      if (defaultValue !== undefined) {
        await window.spark.kv.set(key, defaultValue)
        seeded.push(key)
      }
    }

    return { available: true, missing: missingRequiredKeys(await window.spark.kv.keys()), seeded }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown error'
    return { available: false, missing: REQUIRED_KV_KEYS, seeded: [], error: message }
  }
}
