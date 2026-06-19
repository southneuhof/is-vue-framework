import { beforeEach, describe, expect, it } from 'vitest'
import { resetFrameworkBehaviorsForTests } from '../behaviors'
import { applyFrameworkDefaults, defaultDetailConfig, defaultFormConfig, defaultTableConfig, mergeDefaultConfig } from '../defaults'

describe('component default resolution compatibility', () => {
  beforeEach(() => {
    resetFrameworkBehaviorsForTests()
  })

  it('matches Table.vue default resolution shape', () => {
    applyFrameworkDefaults({
      table: {
        fieldsAlias: { name: 'Nama Kolom' },
        fieldsClass: { name: 'truncate' },
        fieldsType: { active: { type: 'chip', props: { color: 'success' } } },
        fieldsAlign: { active: 'center' },
      },
    })

    const resolved = {
      fieldsAlias: mergeDefaultConfig(defaultTableConfig.fieldsAlias, undefined) || {},
      fieldsClass: mergeDefaultConfig(defaultTableConfig.fieldsClass, undefined) || {},
      fieldsType: mergeDefaultConfig(defaultTableConfig.fieldsType, {
        active: { props: { rounded: true } },
      }) || {},
      fieldsAlign: mergeDefaultConfig(defaultTableConfig.fieldsAlign, undefined) || {},
    }

    expect(resolved.fieldsAlias.name).toBe('Nama Kolom')
    expect(resolved.fieldsClass.name).toBe('truncate')
    expect(resolved.fieldsType.active?.type).toBe('chip')
    expect(resolved.fieldsType.active?.props?.color).toBe('success')
    expect(resolved.fieldsType.active?.props?.rounded).toBe(true)
    expect(resolved.fieldsAlign.active).toBe('center')
  })

  it('matches Detail.vue default resolution shape', () => {
    applyFrameworkDefaults({
      detail: {
        fieldsAlias: { name: 'Nama Detail' },
        fieldsType: { name: { type: 'html' } },
      },
    })

    const resolved = {
      fieldsAlias: mergeDefaultConfig(defaultDetailConfig.fieldsAlias, undefined) || {},
      fieldsType: mergeDefaultConfig(defaultDetailConfig.fieldsType, {
        name: { props: { compact: true } },
      }) || {},
    }

    expect(resolved.fieldsAlias.name).toBe('Nama Detail')
    expect(resolved.fieldsType.name?.type).toBe('html')
    expect(resolved.fieldsType.name?.props?.compact).toBe(true)
  })

  it('matches Form.vue default resolution shape', () => {
    applyFrameworkDefaults({
      form: {
        fieldsAlias: { name: 'Nama Form' },
        inputConfig: { name: { type: 'text', props: { required: true } } },
      },
    })

    const resolved = {
      fieldsAlias: mergeDefaultConfig(defaultFormConfig.fieldsAlias, undefined) || {},
      inputConfig: mergeDefaultConfig(defaultFormConfig.inputConfig, {
        name: { props: { placeholder: 'Nama' } },
      }) || {},
    }

    expect(resolved.fieldsAlias.name).toBe('Nama Form')
    expect(resolved.inputConfig.name?.type).toBe('text')
    expect((resolved.inputConfig.name as any)?.props?.required).toBe(true)
    expect((resolved.inputConfig.name as any)?.props?.placeholder).toBe('Nama')
  })
})
