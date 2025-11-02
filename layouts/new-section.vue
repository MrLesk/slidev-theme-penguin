<script setup lang="ts">
import { computed } from 'vue'
import { useSlideContext } from '@slidev/client'

import SectionTimeline from '../components/SectionTimeline.vue'
import CornerCurves from '../components/corner-curves/CornerCurves.vue'
import { useTimelineResolver, type TimelineFrontmatter } from '../setup/theme/timelines'

const props = defineProps<{ timeline?: TimelineFrontmatter | string | boolean }>()
const { $slidev } = useSlideContext()

const { resolve } = useTimelineResolver($slidev?.configs?.timelinePresets)
const timeline = computed(() => resolve(props.timeline))
</script>

<template>
  <div class="bg-section slidev-layout new-section" :class="timeline ? 'has-timeline' : ''">
    <div v-if="timeline" class="layout-timeline-container">
      <SectionTimeline
        :steps="timeline.steps"
        :current-index="timeline.currentIndex"
        
      />
    </div>
    <CornerCurves class="absolute left-0 top-0 transform rotate-90" />
    <div class="flex flex-col justify-center text-center">
      <slot></slot>
    </div>
    <AsGraphic
      type="zigzag"
      class="absolute top-20 -right-30"
    />
  </div>
</template>

<style>
.slidev-layout.new-section {
  h1 {
    @apply text-primary text-4xl leading-20 mb-0 font-title font-extrabold;
  }

  h1 + p {
    @apply mt-4 opacity-100;
  }

  p > img {
    @apply w-2/3 mx-auto;
  }
}
</style>
