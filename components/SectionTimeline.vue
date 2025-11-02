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

const withStatus = computed(() => props.steps.map((step, index) => ({
  ...step,
  index,
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
        :aria-current="step.isCurrent ? 'step' : undefined"
      >
        <span class="chevron-timeline__label">{{ step.label }}</span>
      </li>
    </ul>
  </nav>
</template>

<style scoped>
.chevron-timeline {
  /* CSS Custom Properties for theming */
  --chevron-timeline-arrow-size: 1.5rem;
  --chevron-timeline-overlap: -0.75rem;
  --chevron-timeline-padding-x: 1rem;
  --chevron-timeline-padding-y: 1rem;

  /* Colors - upcoming step */
  --chevron-timeline-upcoming-bg: rgba(148, 163, 184, 0.25);
  --chevron-timeline-upcoming-text: rgba(62, 81, 102, 0.65);
  --chevron-timeline-upcoming-shadow: rgba(0, 0, 0, 0.08);

  /* Colors - past step */
  --chevron-timeline-past-bg: rgba(52, 211, 153, 0.35);
  --chevron-timeline-past-text: #ffffff;
  --chevron-timeline-past-shadow: rgba(52, 211, 153, 0.3);

  /* Colors - current step */
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
  background: var(--chevron-timeline-upcoming-bg);
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
  filter:
    drop-shadow(0px 1px 0px var(--chevron-timeline-upcoming-shadow))
    drop-shadow(1px 0px 0px var(--chevron-timeline-upcoming-shadow))
    drop-shadow(0px -1px 0px var(--chevron-timeline-upcoming-shadow))
    drop-shadow(-1px 0px 0px var(--chevron-timeline-upcoming-shadow));
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
  background: var(--chevron-timeline-past-bg);
  filter:
    drop-shadow(0px 1px 0px var(--chevron-timeline-past-shadow))
    drop-shadow(1px 0px 0px var(--chevron-timeline-past-shadow))
    drop-shadow(0px -1px 0px var(--chevron-timeline-past-shadow))
    drop-shadow(-1px 0px 0px var(--chevron-timeline-past-shadow));
}

/* Current step styling */
.chevron-timeline__step--current {
  background: var(--chevron-timeline-current-bg);
  filter:
    drop-shadow(0 12px 28px var(--chevron-timeline-current-glow))
    drop-shadow(0px 1px 0px var(--chevron-timeline-current-shadow))
    drop-shadow(1px 0px 0px var(--chevron-timeline-current-shadow))
    drop-shadow(0px -1px 0px var(--chevron-timeline-current-shadow))
    drop-shadow(-1px 0px 0px var(--chevron-timeline-current-shadow));
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
  color: var(--chevron-timeline-upcoming-text);
}

.chevron-timeline__step--past .chevron-timeline__label {
  color: var(--chevron-timeline-past-text);
  font-weight: 600;
}

.chevron-timeline__step--current .chevron-timeline__label {
  color: var(--chevron-timeline-current-text);
  font-weight: 700;
}

/* Dark mode adjustments */
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
