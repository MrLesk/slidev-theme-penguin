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
  <div class="slidev-layout" :class="timeline ? 'has-timeline' : ''">
    <div v-if="timeline" class="layout-timeline-container">
      <SectionTimeline
        :steps="timeline.steps"
        :current-index="timeline.currentIndex"
        :title="timeline.title"
      />
    </div>
    <CornerCurves class="absolute bottom-0 right-0 transform scale-x--100" />
    <div class="grid grid-cols-2 gap-16 z-10 relative">
      <div class="prose">
        <slot name="default"></slot>
      </div>
      <div class="prose">
        <slot name="right"></slot>
      </div>
    </div>
  </div>
</template>
