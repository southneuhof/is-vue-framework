import { behavior, missingBehavior } from '@southneuhof/is-vue-framework/adapters/behaviors'

export async function onDelete(endpoint: string, id: string | number) {
  const onDelete = behavior.crudList?.onDelete
  if (!onDelete) missingBehavior('crudList.onDelete')
  await onDelete(endpoint, id)
}

export async function defaultOnExport({ exportAPI, params, listConfig }: { exportAPI: string; params: Record<string, any>; listConfig: any }) {
  const onExport = behavior.crudList?.onExport
  if (!onExport) missingBehavior('crudList.onExport')
  await onExport({ exportAPI, params, listConfig })
}

export function defaultOnDragChange(reorderAPI: string, event: any) {
  const onDragChange = behavior.crudList?.onDragChange
  if (!onDragChange) missingBehavior('crudList.onDragChange')
  return onDragChange(reorderAPI, event)
}
