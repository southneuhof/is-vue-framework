import { describe, expect, it, vi } from 'vitest'
import { h } from 'vue'
import Table from '../Table.vue'
import { flush, mountCore } from './harness'
import { exportTableRows } from '../../../services/export'
import type { CollectionResult } from '../../../contracts'

describe('Table collection slot', () => {
  it('serves the loaded collection through the slot without rendering the table', async () => {
    const load = vi.fn(async (): Promise<CollectionResult<{ id: string; name: string }>> => ({
      data: [{ id: '1', name: 'One' }],
      meta: { page: 1, pageSize: 10, total: 1, totalPage: 1 },
    }))
    const view = mountCore(
      Table,
      { fields: { name: { label: 'Name' } }, load },
      {
        collection: ({ records }: { records: { name: string }[] }) =>
          h('p', { class: 'slot-view' }, records.map((record) => record.name).join(',')),
      },
    )
    await flush()
    expect(view.text()).toContain('One')
    expect(load).toHaveBeenCalledOnce()
    view.unmount()
  })
})

describe('exportTableRows paging', () => {
  it('pages until meta.totalPage is exhausted and stops', async () => {
    let calls = 0
    const load = async ({ query }: { query: Record<string, unknown> }): Promise<CollectionResult<{ id: number }>> => {
      calls += 1
      const page = Number(query.page)
      return {
        data: Array.from({ length: 2 }, (_, i) => ({ id: (page - 1) * 2 + i })),
        meta: { page, pageSize: 2, total: 6, totalPage: 3 },
      }
    }
    await exportTableRows({
      activeQuery: {},
      searchParameters: {},
      load,
      fields: [{ key: 'id', label: 'ID' }] as never,
    })
    expect(calls).toBe(3)
  })

  it('throws when every page repeats the same signature', async () => {
    const load = async (): Promise<CollectionResult<{ id: number }>> => ({ data: [{ id: 1 }], meta: { totalPage: 99 } })
    await expect(
      exportTableRows({ activeQuery: {}, searchParameters: {}, load, fields: [{ key: 'id' }] as never }),
    ).rejects.toThrowError(/repeated a page/)
  })
})
