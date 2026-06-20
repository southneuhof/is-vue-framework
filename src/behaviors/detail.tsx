import { behavior, missingBehavior } from '@southneuhof/is-vue-framework/adapters/behaviors'

export async function defaultDetailGetData(getAPI: string, searchParameters?: Record<string, any>, getDataID?: string) {
  const getData = behavior.detail?.getData
  if (!getData) missingBehavior('detail.getData')
  return getData(getAPI, searchParameters, getDataID)
}

export function defaultOnDataLoaded(data?: any) {
  return behavior.detail?.onDataLoaded?.(data)
}

export function getDetailFieldTypes(): Record<string, any> {
  return behavior.detail?.fieldTypes ?? {}
}

// Backward compatibility: previous API exported a constant.
export const detailFieldTypes: Record<string, any> = new Proxy(
  {},
  {
    get(_target, prop) {
      return getDetailFieldTypes()[prop as any]
    },
    ownKeys() {
      return Reflect.ownKeys(getDetailFieldTypes())
    },
    getOwnPropertyDescriptor(_target, prop) {
      const descriptor = Object.getOwnPropertyDescriptor(getDetailFieldTypes(), prop)
      return descriptor ? { ...descriptor, configurable: true } : undefined
    },
  },
)
