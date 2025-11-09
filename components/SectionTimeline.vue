<script setup lang="ts">
import { computed } from 'vue'

import type { TimelineStep } from '../setup/theme/timelines'

const props = withDefaults(defineProps<{
  /** Array of timeline steps to display */
  steps: TimelineStep[]
  /** Index of the current step (0-based) */
  currentIndex?: number
  /** Accessible label for the timeline navigation */
  ariaLabel?: string
}>(), {
  currentIndex: 0,
  ariaLabel: 'Timeline',
})

const safeCurrent = computed(() => {
  if (!props.steps.length)
    return 0
  const value = Number.isFinite(props.currentIndex) ? Math.floor(props.currentIndex) : 0
  return Math.min(Math.max(value, 0), props.steps.length - 1)
})

function createCustomStyle(color?: string) {
  if (!color)
    return undefined

  return {
    '--chevron-step-upcoming-bg': `color-mix(in srgb, ${color} 20%, transparent)`,
    '--chevron-step-upcoming-shadow': `color-mix(in srgb, ${color} 25%, rgba(15, 23, 42, 0.25))`,
    '--chevron-step-upcoming-text': `color-mix(in srgb, ${color} 55%, #0f172a)`,
    '--chevron-step-past-bg': `color-mix(in srgb, ${color} 75%, white 25%)`,
    '--chevron-step-past-shadow': `color-mix(in srgb, ${color} 35%, rgba(15, 23, 42, 0.25))`,
    '--chevron-step-past-text': '#ffffff',
    '--chevron-step-current-bg': color,
    '--chevron-step-current-shadow': `color-mix(in srgb, ${color} 55%, rgba(15, 23, 42, 0.35))`,
    '--chevron-step-current-glow': `color-mix(in srgb, ${color} 30%, transparent)`,
    '--chevron-step-current-text': '#ffffff',
  } as Record<string, string>
}

const withStatus = computed(() => props.steps.map((step, index) => ({
  ...step,
  index,
  style: createCustomStyle(step.color),
  isCurrent: index === safeCurrent.value,
  isPast: index < safeCurrent.value,
})))
</script>

<template>
  <nav class="chevron-timeline" :aria-label="ariaLabel">
    <ul class="chevron-timeline__track" role="list">
      <li
        v-for="step in withStatus"
        :key="step.id"
        class="chevron-timeline__step"
        :class="{
          'chevron-timeline__step--current': step.isCurrent,
          'chevron-timeline__step--past': step.isPast
        }"
        :style="step.style"
        :aria-current="step.isCurrent ? 'step' : undefined"
      >
        <span class="chevron-timeline__label">{{ step.label }}</span>
      </li>
    </ul>
  </nav>
</template>

<style scoped>
.chevron-timeline {
  --chevron-timeline-arrow-size: 1.5rem;
  --chevron-timeline-overlap: -0.75rem;
  --chevron-timeline-padding-x: 1rem;
  --chevron-timeline-padding-y: 1rem;

  --chevron-timeline-upcoming-bg: rgba(148, 163, 184, 0.25);
  --chevron-timeline-upcoming-text: rgba(62, 81, 102, 0.65);
  --chevron-timeline-upcoming-shadow: rgba(0, 0, 0, 0.08);

  --chevron-timeline-past-bg: rgba(52, 211, 153, 0.35);
  --chevron-timeline-past-text: #ffffff;
  --chevron-timeline-past-shadow: rgba(52, 211, 153, 0.3);

  --chevron-timeline-current-bg: #10b981;
  --chevron-timeline-current-text: #ffffff;
  --chevron-timeline-current-shadow: rgba(16, 185, 129, 0.5);
  --chevron-timeline-current-glow: rgba(16, 185, 129, 0.35);

  width: 100%;
  padding: 0 2rem;
  margin: 0 auto 2rem;
}

.chevron-timeline__track {
  list-style: none;
  display: flex;
  gap: 0;
  padding: 0;
  margin: 0;
  align-items: center;
  justify-content: center;
}

.chevron-timeline__step {
  position: relative;
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--chevron-timeline-padding-y) calc(var(--chevron-timeline-arrow-size) + var(--chevron-timeline-padding-x)) var(--chevron-timeline-padding-y) calc(var(--chevron-timeline-arrow-size) * 0.5 + var(--chevron-timeline-padding-x));
  background: var(--chevron-step-upcoming-bg, var(--chevron-timeline-upcoming-bg));
  clip-path: polygon(
    0% 0%,
    calc(100% - var(--chevron-timeline-arrow-size)) 0%,
    100% 50%,
    calc(100% - var(--chevron-timeline-arrow-size)) 100%,
    0% 100%,
    var(--chevron-timeline-arrow-size) 50%
  );
  margin-left: var(--chevron-timeline-overlap);
  transition: all 0.2s ease;
  box-shadow: 0 1px 4px var(--chevron-step-upcoming-shadow, var(--chevron-timeline-upcoming-shadow));
}

/* First item has no left arrow indent */
.chevron-timeline__step:first-child {
  margin-left: 0;
  padding-left: calc(var(--chevron-timeline-padding-x) * 2);
  clip-path: polygon(
    0% 0%,
    calc(100% - var(--chevron-timeline-arrow-size)) 0%,
    100% 50%,
    calc(100% - var(--chevron-timeline-arrow-size)) 100%,
    0% 100%
  );
}

/* Last item has no right arrow point */
.chevron-timeline__step:last-child {
  padding-right: calc(var(--chevron-timeline-padding-x) * 2);
  clip-path: polygon(
    0% 0%,
    100% 0%,
    100% 100%,
    0% 100%,
    var(--chevron-timeline-arrow-size) 50%
  );
}

/* First and last combined (single item) */
.chevron-timeline__step:first-child:last-child {
  clip-path: none;
  padding: var(--chevron-timeline-padding-y) calc(var(--chevron-timeline-padding-x) * 2);
  border-radius: 8px;
}

/* Past step styling */
.chevron-timeline__step--past {
  background: var(--chevron-step-past-bg, var(--chevron-timeline-past-bg));
  box-shadow: 0 6px 16px var(--chevron-step-past-shadow, var(--chevron-timeline-past-shadow));
}

/* Current step styling */
.chevron-timeline__step--current {
  background: var(--chevron-step-current-bg, var(--chevron-timeline-current-bg));
  box-shadow:
    0 12px 28px var(--chevron-step-current-glow, var(--chevron-timeline-current-glow)),
    0px 1px 0px var(--chevron-step-current-shadow, var(--chevron-timeline-current-shadow)),
    1px 0px 0px var(--chevron-step-current-shadow, var(--chevron-timeline-current-shadow)),
    0px -1px 0px var(--chevron-step-current-shadow, var(--chevron-timeline-current-shadow)),
    -1px 0px 0px var(--chevron-step-current-shadow, var(--chevron-timeline-current-shadow));
  z-index: 10;
}

.chevron-timeline__label {
  position: relative;
  z-index: 1;
  font-size: 0.8rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  line-height: 1.2;
  text-align: center;
  color: var(--chevron-step-upcoming-text, var(--chevron-timeline-upcoming-text));
}

.chevron-timeline__step--past .chevron-timeline__label {
  color: var(--chevron-step-past-text, var(--chevron-timeline-past-text));
  font-weight: 600;
}

.chevron-timeline__step--current .chevron-timeline__label {
  color: var(--chevron-step-current-text, var(--chevron-timeline-current-text));
  font-weight: 700;
}

html.dark .chevron-timeline {
  --chevron-timeline-upcoming-bg: rgba(148, 163, 184, 0.2);
  --chevron-timeline-upcoming-text: rgba(148, 163, 184, 0.7);
  --chevron-timeline-upcoming-shadow: rgba(255, 255, 255, 0.08);

  --chevron-timeline-past-bg: rgba(52, 211, 153, 0.3);
  --chevron-timeline-past-shadow: rgba(52, 211, 153, 0.25);

  --chevron-timeline-current-bg: rgba(16, 185, 129, 0.9);
  --chevron-timeline-current-shadow: rgba(16, 185, 129, 0.4);
  --chevron-timeline-current-glow: rgba(16, 185, 129, 0.3);
}
</style>
