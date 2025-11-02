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
  status: index < safeCurrent.value ? 'complete' : index === safeCurrent.value ? 'current' : 'upcoming',
})))
</script>

<template>
  <nav class="timeline" aria-label="Presentation Sections">
    <div v-if="title" class="timeline__title">{{ title }}</div>
    <ol class="timeline__list" role="list">
      <li
        v-for="step in withStatus"
        :key="step.id"
        class="timeline__item"
        :class="[
          `timeline__item--${step.status}`,
          { 'timeline__item--current': step.status === 'current' },
        ]"
      >
        <div class="timeline__item-content">
          <span class="timeline__label">{{ step.label }}</span>
          <span v-if="step.description" class="timeline__description">{{ step.description }}</span>
        </div>
      </li>
    </ol>
  </nav>
</template>

<style scoped>
.timeline {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  max-width: min(92%, 980px);
  margin: 0 auto;
  color: inherit;
}

.timeline__title {
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-weight: 600;
  opacity: 0.75;
  text-align: center;
}

.timeline__list {
  list-style: none;
  display: flex;
  gap: 0.75rem;
  padding: 0;
  margin: 0;
}

.timeline__item {
  position: relative;
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.85rem 1rem;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.75);
  border: 1px solid rgba(62, 81, 102, 0.16);
  color: #3e5166;
  font-weight: 600;
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  overflow: hidden;
  backdrop-filter: blur(10px);
}

html.dark .timeline__item {
  background: rgba(30, 43, 55, 0.85);
  border-color: rgba(148, 163, 184, 0.2);
  color: rgba(226, 232, 240, 0.9);
}

.timeline__item::after {
  content: '';
  position: absolute;
  top: 50%;
  right: -0.75rem;
  transform: translateY(-50%);
  border-top: 0.95rem solid transparent;
  border-bottom: 0.95rem solid transparent;
  border-left: 0.95rem solid currentColor;
  opacity: 0.25;
}

.timeline__item:last-child::after {
  display: none;
}

.timeline__item--complete {
  background: linear-gradient(135deg, rgba(52, 211, 153, 0.18), rgba(52, 211, 153, 0.28));
  color: var(--slidev-theme-secondary);
  border-color: rgba(52, 211, 153, 0.45);
}

html.dark .timeline__item--complete {
  background: linear-gradient(135deg, rgba(52, 211, 153, 0.25), rgba(52, 211, 153, 0.15));
  color: rgba(167, 243, 208, 0.95);
}

.timeline__item--current {
  background: linear-gradient(135deg, rgba(62, 81, 102, 0.92), rgba(62, 81, 102, 0.75));
  color: #fff;
  border-color: rgba(62, 81, 102, 0.35);
  box-shadow: 0 12px 28px rgba(62, 81, 102, 0.22);
  transform: translateY(-2px);
}

html.dark .timeline__item--current {
  background: linear-gradient(135deg, rgba(55, 65, 81, 0.95), rgba(30, 41, 59, 0.88));
  border-color: rgba(148, 163, 184, 0.45);
}

.timeline__item--upcoming {
  opacity: 0.75;
}

.timeline__item-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.3rem;
  text-align: center;
}

.timeline__label {
  line-height: 1.2;
}

.timeline__description {
  font-size: 0.7rem;
  font-weight: 400;
  opacity: 0.7;
  text-transform: none;
  letter-spacing: normal;
}

@media (max-width: 768px) {
  .timeline__list {
    flex-direction: column;
  }

  .timeline__item {
    border-radius: 16px;
    padding: 0.75rem 0.9rem;
  }

  .timeline__item::after {
    display: none;
  }
}
</style>
