import { behavior, missingBehavior } from '@southneuhof/is-vue-framework/adapters/behaviors'
import { getInputComponentRegistry } from '../renderers/inputRegistry'

export function defaultBeforeSubmit({ formData }: { formData: object }) {
  return behavior.form?.beforeSubmit?.({ formData }) ?? formData
}

export async function defaultOnSubmit({ payload, method, targetAPI, type }: { payload: object; method: 'put' | 'post'; targetAPI: string; type: 'create' | 'update' }) {
  const onSubmit = behavior.form?.onSubmit
  if (!onSubmit) missingBehavior('form.onSubmit')
  return onSubmit({ payload, method, targetAPI, type })
}

export function defaultOnSuccess({ payload, response }: { payload: object; response: object }) {
  return behavior.form?.onSuccess?.({ payload, response }) ?? { payload, response }
}

export function defaultOnError({ payload, error }: { payload: object; error: any }) {
  return behavior.form?.onError?.({ payload, error }) ?? { payload, error }
}

export async function defaultFormGetData({ getAPI, id, searchParameters }: { getAPI: string; id?: string | number; searchParameters?: object }) {
  const getDetailData = behavior.form?.getDetailData
  if (!getDetailData) missingBehavior('form.getDetailData')
  return getDetailData({ getAPI, id, searchParameters })
}

export function getComponentTypeMap() {
  return getInputComponentRegistry()
}

export const componentTypeMap = new Proxy({} as ReturnType<typeof getComponentTypeMap>, {
  get(_target, property) {
    return getInputComponentRegistry()[property as string]
  },
  ownKeys() {
    return Reflect.ownKeys(getInputComponentRegistry())
  },
  getOwnPropertyDescriptor() {
    return { enumerable: true, configurable: true }
  },
})
