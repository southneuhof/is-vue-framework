import { behavior, missingBehavior } from '@southneuhof/is-vue-framework/adapters/behaviors'

export async function defaultOnExport(detailConfig: any, id: number) {
  const onExport = behavior.crudDetail?.onExport
  if (!onExport) missingBehavior('crudDetail.onExport')
  return onExport(detailConfig, id)
}
