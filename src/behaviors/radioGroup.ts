import { behavior, missingBehavior } from '@southneuhof/is-vue-framework/adapters/behaviors'

export async function defaultGetData(getAPI: string, searchParameters: object) {
  const getData = behavior.radioGroup?.getData
  if (!getData) missingBehavior('radioGroup.getData')
  return getData(getAPI, searchParameters)
}
