<script setup lang="ts">
import { computed } from 'vue'

const presenterImage = computed(() => {
  const image = ($attrs.presenterImage as string) || 'https://anonymous-animals.azurewebsites.net/animal/penguin'

  // External URLs don't need base URL handling
  if (/^https?:\/\//i.test(image)) {
    return image
  }

  // For local paths starting with /, prepend BASE_URL
  const base = import.meta.env.BASE_URL || '/'
  if (image.startsWith('/')) {
    const baseTrimmed = base.endsWith('/') ? base.slice(0, -1) : base
    return `${baseTrimmed}${image}`
  }

  // For relative paths, append to base
  return `${base}${image}`
})
</script>

<template>
  <div class="slidev-layout relative">
    <div class="flex items-center">
      <div class="w-1/2">
        <slot></slot>
      </div>
      <figure class="w-1/2 relative">
        <AsGraphic
          type="donut"
          absolute
          top-2
          left-0
          text-secondary-200
        />
        <AsGraphic
          type="zigzag"
          absolute
          bottom-2
          right-0
        />
        <img
          :src="presenterImage"
          class="bg-gray-400 relative important-rounded-full object-cover h-80 w-80 border border-8 border-secondary-400 z-10"
        />
      </figure>
    </div>
    <AsGraphic
      type="curve-small"
      absolute
      bottom-0
      right-0
    />
  </div>
</template>
