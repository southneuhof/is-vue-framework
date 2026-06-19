import { createApp, defineComponent, h, nextTick } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import ImagePreview from '../ImagePreview.vue'

vi.mock('@headlessui/vue', () => {
  const passthrough = (name: string) =>
    defineComponent({
      name,
      props: {
        show: { type: Boolean, required: false, default: true },
      },
      setup(props, { slots }) {
        return () => (name === 'TransitionRoot' && !props.show ? null : slots.default?.())
      },
    })

  return {
    TransitionRoot: passthrough('TransitionRoot'),
    TransitionChild: passthrough('TransitionChild'),
    Dialog: passthrough('Dialog'),
    DialogPanel: passthrough('DialogPanel'),
  }
})

vi.mock('@southneuhof/is-vue-framework/components/base/Button.vue', () => ({
  default: defineComponent({
    name: 'ButtonStub',
    inheritAttrs: false,
    props: {
      disabled: { type: Boolean, required: false, default: false },
      type: { type: String, required: false, default: 'button' },
    },
    emits: ['click'],
    setup(props, { attrs, emit, slots }) {
      return () =>
        h(
          'button',
          {
            ...attrs,
            disabled: props.disabled,
            type: props.type,
            onClick: (event: MouseEvent) => emit('click', event),
          },
          slots.icon ? slots.icon() : slots.default?.(),
        )
    },
  }),
}))

vi.mock('@southneuhof/is-vue-framework/components/base/Icon.vue', () => ({
  default: defineComponent({
    name: 'IconStub',
    props: {
      name: { type: String, required: false, default: '' },
    },
    setup(props) {
      return () => h('span', { 'data-icon': props.name })
    },
  }),
}))

const mounted: Array<ReturnType<typeof createApp>> = []

function mountImagePreview(props: Record<string, unknown> = {}, slots: Record<string, any> = {}) {
  const host = document.createElement('div')
  document.body.append(host)

  const app = createApp({
    render() {
      return h(ImagePreview, props, slots)
    },
  })

  mounted.push(app)
  app.mount(host)

  return {
    host,
    root: host.firstElementChild as HTMLElement,
  }
}

afterEach(() => {
  for (const app of mounted.splice(0)) app.unmount()
  document.body.innerHTML = ''
  vi.restoreAllMocks()
  vi.useRealTimers()
})

describe('ImagePreview', () => {
  it('renders a single image from the unified image prop and opens the dialog', async () => {
    const { host } = mountImagePreview({
      image: { url: '/detail.jpg', thumbnail: '/thumb.jpg' },
    })

    const image = host.querySelector('img')
    expect(image?.getAttribute('src')).toBe('/thumb.jpg')

    const openButton = host.querySelector('button')
    openButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await nextTick()

    const dialogImages = host.querySelectorAll('img')
    expect(dialogImages[1]?.getAttribute('src')).toBe('/thumb.jpg')
  })

  it('falls back to the detail url when only a single image url is provided', async () => {
    const { host } = mountImagePreview({
      image: { url: '/detail-only.jpg' },
    })

    expect(host.querySelector('img')?.getAttribute('src')).toBe('/detail-only.jpg')

    host.querySelector('button')?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await nextTick()

    const dialogImages = host.querySelectorAll('img')
    expect(dialogImages[1]?.getAttribute('src')).toBe('/detail-only.jpg')
  })

  it('rotates array previews while closed and stops advancing while open', async () => {
    vi.useFakeTimers()

    const { host } = mountImagePreview({
      image: [
        { url: '/detail-1.jpg', thumbnail: '/thumb-1.jpg' },
        { url: '/detail-2.jpg', thumbnail: '/thumb-2.jpg' },
      ],
    })

    expect(host.querySelector('img')?.getAttribute('src')).toBe('/thumb-1.jpg')

    vi.advanceTimersByTime(8000)
    await nextTick()

    expect(host.querySelector('img')?.getAttribute('src')).toBe('/thumb-2.jpg')

    host.querySelector('button')?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await nextTick()

    vi.advanceTimersByTime(8000)
    await nextTick()

    const dialogImages = host.querySelectorAll('img')
    expect(dialogImages[1]?.getAttribute('src')).toBe('/thumb-2.jpg')
  })

  it('supports trigger and image-description slots with active array item props', async () => {
    vi.useFakeTimers()

    const { host } = mountImagePreview(
      {
        image: [
          { url: '/detail-1.jpg', thumbnail: '/thumb-1.jpg' },
          { url: '/detail-2.jpg', thumbnail: '/thumb-2.jpg' },
        ],
      },
      {
        'image-description': ({ image, index }: { image: { thumbnail?: string }; index: number }) => h('span', { 'data-description': image?.thumbnail ?? '', 'data-index': String(index) }, `Image ${index}`),
      },
    )

    expect(host.querySelector('[data-description]')?.getAttribute('data-description')).toBe('/thumb-1.jpg')

    vi.advanceTimersByTime(8000)
    await nextTick()

    expect(host.querySelector('[data-description]')?.getAttribute('data-description')).toBe('/thumb-2.jpg')

    const triggerPreview = mountImagePreview(
      {
        image: [
          { url: '/detail-1.jpg', thumbnail: '/thumb-1.jpg' },
          { url: '/detail-2.jpg', thumbnail: '/thumb-2.jpg' },
        ],
      },
      {
        trigger: ({ index }: { index: number }) => h('button', { type: 'button', 'data-trigger': String(index) }, `Open ${index}`),
      },
    )

    expect(triggerPreview.host.querySelector('[data-trigger]')?.getAttribute('data-trigger')).toBe('0')

    triggerPreview.host.querySelector('[data-trigger]')?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await nextTick()

    expect(triggerPreview.host.textContent).toContain('1 / 2')
  })

  it('renders the no-image slot for null and empty image values', () => {
    const nullPreview = mountImagePreview(
      { image: null },
      { 'no-image': () => h('span', { 'data-empty': 'null' }, 'No image') },
    )

    expect(nullPreview.host.querySelector('[data-empty="null"]')).toBeTruthy()

    const emptyArrayPreview = mountImagePreview(
      { image: [] },
      { 'no-image': () => h('span', { 'data-empty': 'array' }, 'No image') },
    )

    expect(emptyArrayPreview.host.querySelector('[data-empty="array"]')).toBeTruthy()
  })

  it('falls back from thumbnail to url when the thumbnail fails', async () => {
    const { host } = mountImagePreview({
      image: { url: '/detail.jpg', thumbnail: '/broken-thumb.jpg' },
    })

    const image = host.querySelector('img')
    image?.dispatchEvent(new Event('error'))
    await nextTick()

    expect(host.querySelector('img')?.getAttribute('src')).toBe('/detail.jpg')
  })
})
