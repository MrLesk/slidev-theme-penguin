<script setup lang="ts">
import { computed } from 'vue'
import { useSlideContext } from '@slidev/client'

import SectionTimeline from '../components/SectionTimeline.vue'
import CornerCurves from '../components/corner-curves/CornerCurves.vue'
import LayoutHeader from '../components/LayoutHeader.vue'
import { useTimelineResolver, type TimelineFrontmatter } from '../setup/theme/timelines'

const props = defineProps<{ timeline?: TimelineFrontmatter | string | boolean }>()
const { $slidev } = useSlideContext()

const { resolve } = useTimelineResolver($slidev?.configs?.timelinePresets)
const timeline = computed(() => resolve(props.timeline))
</script>

<template>
  <div class="slidev-layout intro grid" :class="timeline ? 'has-timeline' : ''">
    <div v-if="timeline" class="layout-timeline-container">
      <SectionTimeline
        :steps="timeline.steps"
        :current-index="timeline.currentIndex"
        
      />
    </div>
    <LayoutHeader />
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
.slidev-layout.intro {
  h1 {
    @apply text-6xl leading-20 font-display font-extrabold text-primary;
  }

  h1 + p {
    @apply opacity-60 -mt-4 text-2xl;
  }

  a {
    @apply text-secondary-400 hover:text-secondary-500 dark:(text-white hover:text-gray-200);
  }
}
</style>
