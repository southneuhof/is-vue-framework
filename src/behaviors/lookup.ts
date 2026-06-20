import { behavior, missingBehavior } from '@southneuhof/is-vue-framework/adapters/behaviors'

export async function defaultGetData(getAPI: string, searchParameters: object) {
  const getData = behavior.lookup?.getData
  if (!getData) missingBehavior('lookup.getData')
  return getData(getAPI, searchParameters)
}

export async function defaultGetDetail(getAPI: string, id: string | number, searchParameters?: object) {
  const getDetail = behavior.lookup?.getDetail
  if (!getDetail) missingBehavior('lookup.getDetail')
  return getDetail(getAPI, id, searchParameters)
}

export function defaultDataFormatter(data: Array<Record<string, any>>, allowMulti: boolean, pick: string) {
  const dataFormatter = behavior.lookup?.dataFormatter
  if (dataFormatter) return dataFormatter(data, allowMulti, pick)
  if (!allowMulti) return data[0]?.[pick]
  return data
}

export const defaultFieldsAlias: Record<string, string> = behavior.lookup?.fieldsAlias ?? {}
