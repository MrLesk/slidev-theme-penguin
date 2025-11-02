<script setup lang="ts">
import { computed } from 'vue'

import type { TimelineStep } from '../setup/theme/timelines'

const props = withDefaults(defineProps<{
  steps: TimelineStep[]
  currentIndex?: number
  title?: string
}>(), {
  currentIndex: 0,
  title: undefined,
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
  <nav class="chevron-timeline" aria-label="Process Steps">
    <ul class="chevron-timeline__track" role="list">
      <li
        v-for="step in withStatus"
        :key="step.id"
        class="chevron-timeline__step"
        :class="{
          'chevron-timeline__step--current': step.isCurrent,
          'chevron-timeline__step--past': step.isPast
        }"
      >
        <span class="chevron-timeline__label">{{ step.label }}</span>
      </li>
    </ul>
  </nav>
</template>

<style scoped>
.chevron-timeline {
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
  padding: 1rem 2.5rem 1rem 1.5rem;
  background: rgba(148, 163, 184, 0.25);
  color: var(--slidev-theme-primary, #3e5166);
  clip-path: polygon(
    0% 0%,
    calc(100% - 1.5rem) 0%,
    100% 50%,
    calc(100% - 1.5rem) 100%,
    0% 100%,
    1.5rem 50%
  );
  margin-left: -0.75rem;
  transition: all 0.2s ease;
  filter:
    drop-shadow(0px 1px 0px rgba(0, 0, 0, 0.08))
    drop-shadow(1px 0px 0px rgba(0, 0, 0, 0.08))
    drop-shadow(0px -1px 0px rgba(0, 0, 0, 0.08))
    drop-shadow(-1px 0px 0px rgba(0, 0, 0, 0.08));
}

/* First item has no left arrow indent */
.chevron-timeline__step:first-child {
  margin-left: 0;
  padding-left: 2rem;
  clip-path: polygon(
    0% 0%,
    calc(100% - 1.5rem) 0%,
    100% 50%,
    calc(100% - 1.5rem) 100%,
    0% 100%
  );
}

/* Last item has no right arrow point */
.chevron-timeline__step:last-child {
  padding-right: 2rem;
  clip-path: polygon(
    0% 0%,
    100% 0%,
    100% 100%,
    0% 100%,
    1.5rem 50%
  );
}

/* First and last combined (single item) */
.chevron-timeline__step:first-child:last-child {
  clip-path: none;
  padding: 1rem 2rem;
  border-radius: 8px;
}

/* Past step styling - light green */
.chevron-timeline__step--past {
  background: rgba(52, 211, 153, 0.35);
  filter:
    drop-shadow(0px 1px 0px rgba(52, 211, 153, 0.3))
    drop-shadow(1px 0px 0px rgba(52, 211, 153, 0.3))
    drop-shadow(0px -1px 0px rgba(52, 211, 153, 0.3))
    drop-shadow(-1px 0px 0px rgba(52, 211, 153, 0.3));
}

/* Current step styling - darker green */
.chevron-timeline__step--current {
  background: #10b981;
  filter:
    drop-shadow(0 12px 28px rgba(16, 185, 129, 0.35))
    drop-shadow(0px 1px 0px rgba(16, 185, 129, 0.5))
    drop-shadow(1px 0px 0px rgba(16, 185, 129, 0.5))
    drop-shadow(0px -1px 0px rgba(16, 185, 129, 0.5))
    drop-shadow(-1px 0px 0px rgba(16, 185, 129, 0.5));
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
  color: rgba(62, 81, 102, 0.65);
}

.chevron-timeline__step--past .chevron-timeline__label {
  color: #ffffff;
  font-weight: 600;
}

.chevron-timeline__step--current .chevron-timeline__label {
  color: #ffffff;
  font-weight: 700;
}

/* Dark mode adjustments */
html.dark .chevron-timeline__step {
  background: rgba(148, 163, 184, 0.2);
  filter:
    drop-shadow(0px 1px 0px rgba(255, 255, 255, 0.08))
    drop-shadow(1px 0px 0px rgba(255, 255, 255, 0.08))
    drop-shadow(0px -1px 0px rgba(255, 255, 255, 0.08))
    drop-shadow(-1px 0px 0px rgba(255, 255, 255, 0.08));
}

html.dark .chevron-timeline__step--past {
  background: rgba(52, 211, 153, 0.3);
  filter:
    drop-shadow(0px 1px 0px rgba(52, 211, 153, 0.25))
    drop-shadow(1px 0px 0px rgba(52, 211, 153, 0.25))
    drop-shadow(0px -1px 0px rgba(52, 211, 153, 0.25))
    drop-shadow(-1px 0px 0px rgba(52, 211, 153, 0.25));
}

html.dark .chevron-timeline__step--current {
  background: rgba(16, 185, 129, 0.9);
  filter:
    drop-shadow(0 12px 28px rgba(16, 185, 129, 0.3))
    drop-shadow(0px 1px 0px rgba(16, 185, 129, 0.4))
    drop-shadow(1px 0px 0px rgba(16, 185, 129, 0.4))
    drop-shadow(0px -1px 0px rgba(16, 185, 129, 0.4))
    drop-shadow(-1px 0px 0px rgba(16, 185, 129, 0.4));
}

html.dark .chevron-timeline__label {
  color: rgba(148, 163, 184, 0.7);
}

html.dark .chevron-timeline__step--past .chevron-timeline__label {
  color: #ffffff;
}

html.dark .chevron-timeline__step--current .chevron-timeline__label {
  color: #ffffff;
}
</style>
