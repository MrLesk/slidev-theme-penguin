<script setup lang="ts">
import { computed } from 'vue'
import { useSlideContext } from '@slidev/client'

import SectionTimeline from '../components/SectionTimeline.vue'
import TheConsole from '../components/TheConsole.vue'
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
        
      />
    </div>
    <div
      class="grid grid-cols-2"
      :class="$attrs.reverse ? 'gap-16' : 'gap-8'"
    >
      <div
        class="prose pr-16"
        :class="{ 'order-1': $attrs.reverse }"
      >
        <slot name="default"></slot>
      </div>
      <div class="relative">
        <AsGraphic
          type="zigzag"
          class="absolute transform scale-75 -bottom-20 -right-16"
          :class="{ 'left-0': $attrs.reverse }"
        />
        <TheConsole class="rounded-lg shadow-lg object-cover z-10">
          <slot name="window"></slot>
        </TheConsole>
      </div>
    </div>
  </div>
</template>
