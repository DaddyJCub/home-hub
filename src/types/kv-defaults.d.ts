declare module '../../kv-defaults.mjs' {
  export const KV_DEFAULTS: Record<string, any>
  export const REQUIRED_KV_KEYS: string[]
  export function cloneDefaultValue(key: string): any
}
