import { behavior, missingBehavior } from '@southneuhof/is-vue-framework/adapters/behaviors'

export async function defaultTableGetData(getAPI: string, searchParameters?: Record<string, number | string | undefined>) {
  const getData = behavior.table?.getData
  if (!getData) missingBehavior('table.getData')
  return getData(getAPI, searchParameters)
}

export function defaultOnDataLoaded(data?: any) {
  return behavior.table?.onDataLoaded?.(data)
}

export function getTableFieldTypes(): Record<string, any> {
  return behavior.table?.fieldTypes ?? {}
}

// Backward compatibility: previous API exported a constant.
export const tableFieldTypes: Record<string, any> = new Proxy(
  {},
  {
    get(_target, prop) {
      return getTableFieldTypes()[prop as any]
    },
    ownKeys() {
      return Reflect.ownKeys(getTableFieldTypes())
    },
    getOwnPropertyDescriptor(_target, prop) {
      const descriptor = Object.getOwnPropertyDescriptor(getTableFieldTypes(), prop)
      return descriptor ? { ...descriptor, configurable: true } : undefined
    },
  },
)
