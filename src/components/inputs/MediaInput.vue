<script setup lang="ts">
import { computed, ref, watch, type PropType } from 'vue'
import { defaultFileInputUpload, type FileInputUploadBehavior } from '@southneuhof/is-vue-framework/behaviors/fileInput'
import BaseInput from './BaseInput.vue'
import { commonProps } from './commonprops'
import { normalizeFileAssetValue, type FileAssetValue } from './assetValue'
import { MIME_TYPE_NAMES } from '@southneuhof/utilities/object'
import { toast } from 'vue-sonner'
import Button from '@southneuhof/is-vue-framework/components/base/Button.vue'
import Icon from '@southneuhof/is-vue-framework/components/base/Icon.vue'
import ImagePreview from '@southneuhof/is-vue-framework/components/base/ImagePreview.vue'
import Popover from '@southneuhof/is-vue-framework/components/base/Popover.vue'
import Spinner from '@southneuhof/is-vue-framework/components/base/Spinner.vue'
import FileManager from '@southneuhof/is-vue-framework/components/utils/FileManager/FileManager.vue'
import { Dialog, DialogContent } from '@southneuhof/is-vue-framework/components/base/Dialog/index'

type MediaMode = 'image' | 'video' | 'mixed'

const VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime']

const props = defineProps({
  mode: {
    type: String as PropType<MediaMode>,
    default: 'mixed',
  },
  maxSize: {
    type: Number,
    default: undefined,
  },
  multi: {
    type: Boolean,
    default: false,
  },
  uploadPath: {
    type: String,
    default: '',
  },
  fileUpload: {
    type: Function as PropType<FileInputUploadBehavior>,
    default: defaultFileInputUpload,
  },
  ...commonProps,
})

const emit = defineEmits<{
  (event: 'validation:touch'): void
}>()

const modelValue = defineModel<FileAssetValue | FileAssetValue[] | null>()
const items = ref<FileAssetValue[]>([])
const uploadPercentage = ref(0)
const uploadDetail = ref<File | null>(null)
const isUploading = ref(false)
const sourcePopoverOpen = ref(false)
const fileManagerOpen = ref(false)
const fileInput = ref<HTMLInputElement>()

const acceptTypes = computed(() => {
  if (props.mode === 'image') return ['image/*']
  if (props.mode === 'video') return VIDEO_TYPES
  return ['image/*', ...VIDEO_TYPES]
})
const maxFileSize = computed(() => props.maxSize ?? 10)
const acceptTypesPretty = computed(() => acceptTypes.value.map((type) => MIME_TYPE_NAMES[type] ?? type))
const helperMessage = computed(() => props.helperMessage || `Tipe file: ${acceptTypesPretty.value.join(', ')}. Maksimal ukuran file ${maxFileSize.value}MB.`)
const addIcon = computed(() => props.mode === 'video' ? 'video-add' : 'image-add')

function syncItems(value: unknown) {
  const values = Array.isArray(value) ? value : value ? [value] : []
  items.value = values.map((item) => normalizeFileAssetValue(item)).filter((item): item is FileAssetValue => Boolean(item))
}

syncItems(modelValue.value)

function emitChanges() {
  modelValue.value = props.multi ? items.value : items.value[0] || null
}

function matchesAccept(contentType = '') {
  return acceptTypes.value.some((type) => type.endsWith('/*') ? contentType.startsWith(type.slice(0, -1)) : contentType === type)
}

function validateFileLike(contentType?: string, size?: number): boolean {
  if (contentType && !matchesAccept(contentType)) {
    toast.error(`Tipe berkas tidak didukung. Tipe berkas yang diterima adalah ${acceptTypesPretty.value.join(', ')}`)
    return false
  }
  if (typeof size === 'number' && size > maxFileSize.value * 1024 * 1024) {
    toast.error(`Ukuran berkas terlalu besar. Maksimal ${maxFileSize.value}MB`)
    return false
  }
  return true
}

function handleFileUpload(files: File | File[]) {
  const incomingFiles = Array.isArray(files) ? files : [files]
  const fileArray = props.multi ? incomingFiles : incomingFiles.slice(0, 1)

  fileArray.forEach((file) => {
    if (!validateFileLike(file.type, file.size)) return
    isUploading.value = true
    props.fileUpload(file, props.uploadPath, (event: any) => {
      uploadDetail.value = file
      uploadPercentage.value = Math.round((100 * event.loaded) / event.total)
    })
      .then((res) => {
        const normalized = normalizeFileAssetValue(res)
        if (!normalized) throw new Error('Invalid upload response')
        if (props.multi) items.value.push(normalized)
        else items.value = [normalized]
        uploadPercentage.value = 0
        isUploading.value = false
        emitChanges()
        emit('validation:touch')
      })
      .catch((err) => {
        toast.error(`Gagal mengunggah berkas: ${err}`)
        isUploading.value = false
      })
  })
}

function handleInputChange(event: Event) {
  const target = event.target as HTMLInputElement
  handleFileUpload(Array.from(target.files ?? []))
  target.value = ''
}

function openDevicePicker() {
  sourcePopoverOpen.value = false
  fileInput.value?.click()
}

function openFileManager() {
  sourcePopoverOpen.value = false
  fileManagerOpen.value = true
}

function selectFileManagerAsset(payload: unknown) {
  const normalized = normalizeFileAssetValue(payload)
  if (!normalized || normalized.type === 'folder') return
  if (!validateFileLike(normalized.content_type, normalized.size)) return

  if (props.multi) items.value.push(normalized)
  else items.value = [normalized]

  emitChanges()
  emit('validation:touch')
  fileManagerOpen.value = false
}

function removeItem(index: number) {
  items.value.splice(index, 1)
  emitChanges()
  emit('validation:touch')
}

function isImage(item: FileAssetValue) {
  return item.content_type.startsWith('image/')
}

function isVideo(item: FileAssetValue) {
  return item.content_type.startsWith('video/')
}

watch(modelValue, syncItems)
</script>

<template>
  <BaseInput v-bind="{ ...props, helperMessage }">
    <div class="flex flex-col gap-4">
      <div class="flex flex-row flex-wrap items-center gap-4">
        <template v-for="(item, index) in items" :key="item.path || index">
          <div class="relative w-fit rounded-xl">
            <ImagePreview v-if="isImage(item)" :image="{ url: item.url }">
              <template #actions>
                <Button type="button" color="error" kind="icon" @click.stop="removeItem(index)">
                  <template #icon><Icon name="delete-bin" /></template>
                </Button>
              </template>
            </ImagePreview>
            <div v-else-if="isVideo(item)" class="group relative flex h-40 w-40 items-center justify-center overflow-hidden rounded-xl bg-black">
              <video class="h-full w-full object-contain" :src="item.url" controls />
              <Button type="button" color="error" kind="icon" class="absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100" @click="removeItem(index)">
                <template #icon><Icon name="delete-bin" /></template>
              </Button>
            </div>
            <div v-else class="flex h-40 w-40 items-center justify-center gap-2 rounded-xl bg-surface-container-high">
              <Icon name="file" />
              <span class="text-sm">{{ item.filename || item.path.split('/').pop() }}</span>
            </div>
          </div>
        </template>

        <template v-if="!isUploading">
          <Popover v-if="props.multi || items.length == 0" v-model="sourcePopoverOpen">
            <template #trigger>
              <button type="button" class="relative flex h-40 w-40 items-center justify-center rounded-xl outline-dashed outline-2 outline-outline transition-colors hover:bg-primary/10 hover:outline-primary/[33%]">
                <Icon :name="addIcon" size="2xl" class="text-on-surface" />
                <div class="absolute left-0 top-0 h-full w-full">
                  <div v-if="uploadPercentage != 0 && uploadPercentage != 100" class="absolute h-40 w-40 rounded-xl bg-tertiary/20" :style="{ width: uploadPercentage + '%' }"></div>
                </div>
              </button>
            </template>
            <template #content>
              <div class="min-w-56 rounded-lg border border-outline/[12%] bg-surface-container p-1 text-on-surface shadow-elevation-3">
                <button type="button" class="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-on-surface/[8%]" @click="openDevicePicker">
                  <Icon name="upload-cloud" size="sm" />
                  <span>Upload from device</span>
                </button>
                <button type="button" class="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-on-surface/[8%]" @click="openFileManager">
                  <Icon name="folder-2" size="sm" />
                  <span>Choose from file manager</span>
                </button>
              </div>
            </template>
          </Popover>
          <input ref="fileInput" type="file" hidden :multiple="props.multi" :accept="acceptTypes.join(',')" @change="handleInputChange" />
        </template>
        <div v-else class="relative flex h-40 w-40 flex-col items-center justify-center rounded-xl outline-dashed outline-2 outline-outline">
          <Spinner />
          <p class="text-xs">Uploading {{ uploadDetail?.name || 'media' }}...</p>
        </div>
      </div>
    </div>
  </BaseInput>
  <Dialog v-model:open="fileManagerOpen">
    <DialogContent class="flex h-[60vh] max-w-[60vw] flex-col">
      <FileManager :activePath="props.uploadPath || '/storage/public'">
        <template #footer="{ data }">
          <div class="flex flex-row items-center justify-end gap-2">
            <Button kind="button" variant="text" type="button" @click="() => (fileManagerOpen = false)">Cancel</Button>
            <Button type="button" :disabled="!data || data.type === 'folder'" @click="() => selectFileManagerAsset(data)">Open</Button>
          </div>
        </template>
      </FileManager>
    </DialogContent>
  </Dialog>
</template>
