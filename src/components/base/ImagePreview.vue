<script setup lang="ts">
import { TransitionRoot, TransitionChild, Dialog, DialogPanel } from '@headlessui/vue'
import { computed, onBeforeUnmount, ref, useSlots, watch, type PropType } from 'vue'
import { twMerge } from 'tailwind-merge'
import Button from '@southneuhof/is-vue-framework/components/base/Button.vue'
import Icon from '@southneuhof/is-vue-framework/components/base/Icon.vue'

type ImageLike = {
  url?: string | null
  thumbnail?: string | null
}

const props = defineProps({
  image: {
    type: [Object, Array] as PropType<ImageLike | ImageLike[] | null | undefined>,
    required: false,
    default: null,
  },
  isOpen: {
    type: Boolean,
    required: false,
    default: false,
  },
  disableControls: {
    type: Boolean,
    required: false,
    default: false,
  },
})

const slots = useSlots()

const isOpen = ref(props.isOpen)
const currentIndex = ref(0)
const thumbnailError = ref<Record<number, boolean>>({})
const detailError = ref<Record<number, boolean>>({})

const normalizedImages = computed<ImageLike[]>(() => {
  const items = Array.isArray(props.image) ? props.image : props.image ? [props.image] : []

  return items.filter((item): item is ImageLike => Boolean(item?.url || item?.thumbnail))
})

const hasImages = computed(() => normalizedImages.value.length > 0)
const hasMultipleImages = computed(() => normalizedImages.value.length > 1)
const currentImage = computed(() => normalizedImages.value[currentIndex.value] ?? null)

const activeSlotProps = computed(() => ({
  image: currentImage.value,
  index: currentIndex.value,
  images: normalizedImages.value,
  isOpen: isOpen.value,
}))

function getImageCandidates(image: ImageLike | null | undefined) {
  if (!image) return []
  const list = [image.thumbnail, image.url].filter((item): item is string => Boolean(item))
  return [...new Set(list)]
}

const thumbnailSrc = computed(() => {
  const candidates = getImageCandidates(currentImage.value)
  if (thumbnailError.value[currentIndex.value]) {
    return candidates[1] ?? null
  }
  return candidates[0] ?? null
})

const detailSrc = computed(() => {
  const candidates = getImageCandidates(currentImage.value)
  if (detailError.value[currentIndex.value]) {
    return candidates[1] ?? null
  }
  return candidates[0] ?? null
})

watch(
  () => props.isOpen,
  (nextValue) => {
    isOpen.value = nextValue
  },
)

watch(
  normalizedImages,
  (images) => {
    thumbnailError.value = {}
    detailError.value = {}

    if (!images.length) {
      currentIndex.value = 0
      isOpen.value = false
      return
    }

    if (currentIndex.value > images.length - 1) {
      currentIndex.value = images.length - 1
    }
  },
  { deep: true, immediate: true },
)

function onThumbnailError() {
  thumbnailError.value = {
    ...thumbnailError.value,
    [currentIndex.value]: true,
  }
}

function onDetailError() {
  detailError.value = {
    ...detailError.value,
    [currentIndex.value]: true,
  }
}

function openDialog(index = currentIndex.value) {
  if (slots['image-thumbnail']) {
    currentIndex.value = Math.min(Math.max(index, 0), Math.max(normalizedImages.value.length - 1, 0))
    isOpen.value = true
    return
  }

  if (!hasImages.value) return
  if (!getImageCandidates(normalizedImages.value[index] ?? currentImage.value).length) return

  currentIndex.value = Math.min(Math.max(index, 0), normalizedImages.value.length - 1)
  isOpen.value = true
}

function closeDialog() {
  isOpen.value = false
}

function nextImage() {
  if (!hasMultipleImages.value) return
  currentIndex.value = Math.min(currentIndex.value + 1, normalizedImages.value.length - 1)
}

function prevImage() {
  if (!hasMultipleImages.value) return
  currentIndex.value = Math.max(currentIndex.value - 1, 0)
}

const rotationTimer = window.setInterval(() => {
  if (isOpen.value || !hasMultipleImages.value) return
  currentIndex.value = (currentIndex.value + 1) % normalizedImages.value.length
}, 8000)

onBeforeUnmount(() => {
  window.clearInterval(rotationTimer)
})
</script>

<template>
  <div v-if="!$slots.trigger" :class="twMerge('relative flex aspect-square h-40 min-h-[120px] items-center justify-center rounded-xl bg-surface-container-high ', $attrs.class as string)">
    <div
      v-if="!props.disableControls && hasImages"
      class="absolute flex h-full w-full flex-row items-center justify-center gap-2 rounded-xl bg-black/[12%] text-on-surface opacity-0 transition-opacity duration-100 hover:opacity-100"
    >
      <Button @click="() => openDialog()" color="info" kind="icon" type="button">
        <template #icon>
          <Icon size="lg" name="eye"></Icon>
        </template>
      </Button>
      <slot name="actions" v-bind="activeSlotProps" />
    </div>
    <div
      v-else
      @click="() => openDialog()"
      class="absolute flex h-full w-full cursor-pointer flex-row items-center justify-center gap-2 rounded-xl bg-black/[12%] text-on-surface opacity-0 transition-opacity duration-100 hover:opacity-100"
    ></div>
    <div v-if="$slots['image-description']" class="absolute bottom-4 rounded-xl bg-scrim/[18%] px-4 py-2 text-sm text-white">
      <slot name="image-description" v-bind="activeSlotProps" />
    </div>
    <slot v-if="$slots['image-thumbnail']" name="image-thumbnail" v-bind="activeSlotProps" />
    <template v-else>
      <img v-if="thumbnailSrc" class="h-full w-full rounded-xl bg-surface-container-high object-cover" :src="thumbnailSrc" @error="onThumbnailError" />
      <div v-else class="flex h-full w-full items-center justify-center rounded-xl bg-surface-container-high">
        <div v-if="$slots['no-image']" class="text-sm text-muted">
          <slot name="no-image" v-bind="activeSlotProps" />
        </div>
        <Icon v-else size="lg" name="user"></Icon>
      </div>
    </template>
  </div>
  <div v-else @click="() => openDialog()">
    <slot name="trigger" v-bind="activeSlotProps" />
  </div>
  <TransitionRoot appear :show="isOpen" as="template">
    <Dialog as="div" @close="closeDialog" class="relative z-10" id="dialog">
      <TransitionChild as="template" enter="duration-300 ease-out" enter-from="opacity-0" enter-to="opacity-100" leave="duration-200 ease-in" leave-from="opacity-100" leave-to="opacity-0">
        <div class="fixed inset-0 bg-black bg-opacity-25" />
      </TransitionChild>
      <div class="fixed inset-0 overflow-y-auto">
        <div class="flex min-h-full items-center justify-center p-4 text-center">
          <TransitionChild
            as="template"
            enter="duration-100 ease-out"
            enter-from="opacity-0 scale-95"
            enter-to="opacity-100 scale-100"
            leave="duration-100 ease-in"
            leave-from="opacity-50 scale-100"
            leave-to="opacity-0 scale-95"
          >
            <div class="fixed inset-0 overflow-y-auto">
              <div class="flex min-h-full items-center justify-center">
                <DialogPanel class="max-w-screen-lg">
                  <div class="relative">
                    <button class="absolute right-4 top-4 text-on-surface" @click="closeDialog()"><Icon name="close"></Icon></button>
                    <slot v-if="$slots['image-detail']" name="image-detail" v-bind="activeSlotProps" />
                    <img v-else-if="detailSrc" class="h-full rounded-xl bg-surface-container-high object-scale-down" :src="detailSrc" @error="onDetailError" />
                    <div v-else class="flex h-[240px] w-[240px] items-center justify-center rounded-xl bg-surface-container-high text-muted">
                      <Icon size="lg" name="user"></Icon>
                    </div>
                    <div v-if="hasMultipleImages" class="absolute bottom-4 left-4 right-4 flex items-center justify-between">
                      <Button :disabled="currentIndex === 0" @click="prevImage" type="button"><Icon name="arrow-left-s"></Icon></Button>
                      <span class="text-white">{{ currentIndex + 1 }} / {{ normalizedImages.length }}</span>
                      <Button :disabled="currentIndex === normalizedImages.length - 1" @click="nextImage" type="button"><Icon name="arrow-right-s"></Icon></Button>
                    </div>
                  </div>
                </DialogPanel>
              </div>
            </div>
          </TransitionChild>
        </div>
      </div>
    </Dialog>
  </TransitionRoot>
</template>
