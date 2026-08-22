import { afterEach, describe, expect, it } from 'vitest'
import type { CollectionResult, WebResourceSchema } from '../../contracts'
import { createFrameworkQueryClient } from '../../query/client'
import { resolveFrameworkAdapters } from '../../adapters/projectAdapters'
import { resolveFrameworkFieldDefaults } from '../../fields/defaults'
import { defineFields } from '../../fields/defineFields'
import { createInputPropsRegistry } from '../../renderers/inputProps'
import { defineResource } from '../defineResource'
import { defineSchema } from '../defineSchema'
import { resetResourceActionRegistry } from '../routeAccess'
import { registerResourceRuntime, resetResourceRuntimeForTests } from '../runtime'

type Row = { id: string; name: string }
type Draft = { name: string }
type Schema = WebResourceSchema<Row, Record<string, never>, Draft, Draft, string>

const schema = defineSchema<Schema>({ identity: 'id' })
const fields = defineFields(schema, {
  name: { label: 'Name', table: { sortable: true }, form: { renderer: 'text' } },
})

type AssetRecord = { id: string; imgThumbnail: string | null }
type AssetDraft = { imgThumbnail?: string | null }
type AssetSchema = WebResourceSchema<AssetRecord, Record<string, never>, AssetDraft, AssetDraft, string>

const assetSchema = defineSchema<AssetSchema>({ identity: 'id' })
const assetFields = defineFields(assetSchema, {
  imgThumbnail: { label: 'Image', form: { renderer: 'image' } },
})

function resource(access = { allows: () => true }) {
  registerResourceRuntime({
    queryClient: createFrameworkQueryClient(),
    adapters: resolveFrameworkAdapters({ access }),
    fieldDefaults: resolveFrameworkFieldDefaults(),
  })
  return defineResource(schema, {
    key: 'records',
    actions: {
      list: {
        run: async (): Promise<CollectionResult<Row>> => ({ data: [{ id: '1', name: 'One' }] }),
        fields: [fields.name],
        permission: 'records.list',
        route: { name: 'records-list' },
      },
      detail: {
        run: async ({ id }) => ({ id, name: 'One' }),
        fields: [fields.name],
        permission: 'records.detail',
        route: { name: 'records-detail', params: (id) => ({ id }) },
        title: 'Detail Record',
      },
      create: {
        run: async (input) => ({ id: '2', ...input }),
        fields: [fields.name],
        permission: 'records.create',
        route: { name: 'records-create' },
      },
      update: {
        run: async (id, input) => ({ id, name: input.name }),
        fields: [fields.name],
        permission: 'records.update',
        route: { name: 'records-edit', params: (id) => ({ id }) },
      },
      delete: {
        run: async () => undefined,
        permission: 'records.delete',
      },
      verify: { run: async (id: string, result: 'approved' | 'rejected') => `${id}:${result}` },
    },
  })
}

afterEach(() => {
  resetResourceRuntimeForTests()
  resetResourceActionRegistry()
})

describe('action resources', () => {
  it('reads wire asset values before resource records reach the UI', async () => {
    const read = (value: unknown) => typeof value === 'string'
      ? { kind: 'file', id: value, url: `https://files.test/${value}`, name: value.split('/').pop() }
      : value
    registerResourceRuntime({
      queryClient: createFrameworkQueryClient(),
      adapters: resolveFrameworkAdapters(),
      fieldDefaults: resolveFrameworkFieldDefaults(),
      inputProps: createInputPropsRegistry({ image: { value: { read, write: (value) => value } } }),
    })
    const value = defineResource(assetSchema, {
      key: 'asset-records',
      actions: {
        detail: {
          run: async () => ({ id: '1', imgThumbnail: 'uploads/cover.png' }),
          fields: [assetFields.imgThumbnail],
        },
      },
    })

    await expect(value.detail({ id: '1' }).run()).resolves.toMatchObject({
      imgThumbnail: { kind: 'file', id: 'uploads/cover.png', name: 'cover.png' },
    })
  })

  it('builds standard surfaces and keeps custom actions explicit', async () => {
    const value = resource()
    const list = value.list()
    const record = { id: '1', name: 'One' }

    expect(list.fields).toEqual([expect.objectContaining({ key: 'name', label: 'Name', table: { sortable: true }, form: { renderer: 'text' } })])
    expect(list.createRoute).toEqual({ name: 'records-create' })
    expect(list.detailRoute?.(record)).toEqual({ name: 'records-detail', params: { id: '1' } })
    expect(list.updateRoute?.(record)).toEqual({ name: 'records-edit', params: { id: '1' } })
    expect(list.canDelete?.(record)).toBe(true)
    const detail = value.detail({ id: '1' })
    expect(detail.title).toBe('Detail Record')
    expect(detail.backTo).toEqual({ name: 'records-list' })
    await expect(value.actions.verify.run('1', 'approved')).resolves.toBe('1:approved')
    await expect(value.create().run({ name: 'Two' })).resolves.toEqual({ id: '2', name: 'Two' })
    expect(value.create().defaultTo?.({ id: '2', name: 'Two' })).toEqual({ name: 'records-detail', params: { id: '2' } })
    expect(value.update({ id: '1' }).defaultTo?.({ id: '1', name: 'One' })).toEqual({ name: 'records-detail', params: { id: '1' } })
  })

  it('lets create and update replace or clear the detail defaultTo', () => {
    registerResourceRuntime({
      queryClient: createFrameworkQueryClient(),
      adapters: resolveFrameworkAdapters(),
      fieldDefaults: resolveFrameworkFieldDefaults(),
    })
    const list = { name: 'records-list' }
    const value = defineResource(schema, {
      key: 'records-override',
      actions: {
        detail: {
          run: async ({ id }) => ({ id, name: 'One' }),
          route: { name: 'records-detail', params: (id) => ({ id }) },
        },
        create: {
          run: async (input) => ({ id: '2', ...input }),
          defaultTo: list,
        },
        update: {
          run: async (id, input) => ({ id, name: input.name }),
          defaultTo: false,
        },
      },
    })

    expect(value.create().defaultTo?.({ id: '2', name: 'Two' })).toEqual(list)
    expect(value.update({ id: '1' }).defaultTo).toBeUndefined()
  })

  it('filters standard routes and row actions through access', () => {
    const value = resource({ allows: ({ operation }: { operation: string }) => operation === 'list' })
    const list = value.list()
    const record = { id: '1', name: 'One' }

    expect(list.createRoute).toBeUndefined()
    expect(list.detailRoute?.(record)).toBeUndefined()
    expect(list.updateRoute?.(record)).toBeUndefined()
    expect(list.canDelete).toBeUndefined()
  })

  it('injects operation and declared permission into form field context', () => {
    const value = resource()

    expect(value.create().context).toEqual({ operation: 'create', permission: 'records.create' })
    expect(value.update({ id: '1' }).context).toEqual({ operation: 'update', permission: 'records.update' })
  })

  it('keeps caller context keys and wins over reserved action keys', () => {
    registerResourceRuntime({
      queryClient: createFrameworkQueryClient(),
      adapters: resolveFrameworkAdapters(),
      fieldDefaults: resolveFrameworkFieldDefaults(),
    })
    const value = defineResource(schema, {
      key: 'records-context',
      actions: {
        create: {
          run: async (input) => ({ id: '2', ...input }),
          fields: [fields.name],
          permission: 'records.create',
        },
        update: {
          run: async (id, input) => ({ id, name: input.name }),
          fields: [fields.name],
          permission: null,
        },
      },
    })

    expect(value.create({ context: { ticket: 't-1', operation: 'delete', permission: 'records.delete' } }).context).toEqual({
      ticket: 't-1',
      operation: 'create',
      permission: 'records.create',
    })
    expect(value.update({ id: '1', context: { ticket: 't-2', permission: 'records.delete' } }).context).toEqual({
      ticket: 't-2',
      operation: 'update',
      permission: null,
    })
  })

  it('composes form context even when the caller supplies none', () => {
    registerResourceRuntime({
      queryClient: createFrameworkQueryClient(),
      adapters: resolveFrameworkAdapters(),
      fieldDefaults: resolveFrameworkFieldDefaults(),
    })
    const value = defineResource(schema, {
      key: 'records-no-permission',
      actions: {
        create: { run: async (input) => ({ id: '2', ...input }), fields: [fields.name] },
        update: { run: async (id, input) => ({ id, name: input.name }), fields: [fields.name] },
      },
    })

    expect(value.create().context).toEqual({ operation: 'create', permission: null })
    expect(value.update({ id: '1' }).context).toEqual({ operation: 'update', permission: null })
  })
})
