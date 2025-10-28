<template>
  <span class="prompt-chip" :data-variant="variant" :data-size="size">
    <slot />
  </span>
</template>

<script setup lang="ts">
defineOptions({ name: 'PromptChip' })

withDefaults(
  defineProps<{
    variant?: 'default' | 'primary' | 'secondary' | 'accent'
    size?: 'sm' | 'md' | 'lg'
  }>(),
  {
    variant: 'default',
    size: 'md',
  },
)
</script>

<style scoped>
.prompt-chip {
  @apply inline-flex items-center gap-1 font-medium tracking-tight;
  @apply rounded-lg border;
  letter-spacing: 0.01em;
}

/* Sizes */
.prompt-chip[data-size="sm"] {
  @apply px-2 py-0.5 text-xs;
}

.prompt-chip[data-size="md"] {
  @apply px-3 py-1 text-sm;
}

.prompt-chip[data-size="lg"] {
  @apply px-4 py-1.5 text-base;
}

/* Default variant - using secondary theme colors */
.prompt-chip[data-variant="default"] {
  background-color: var(--slidev-theme-secondary-light, #d1fae5);
  color: var(--slidev-theme-secondary-dark, #0b3a2c);
  border-color: color-mix(in srgb, var(--slidev-theme-secondary, #14b8a6) 55%, transparent);
  box-shadow: 0 12px 24px -18px color-mix(in srgb, var(--slidev-theme-secondary, #14b8a6) 65%, transparent);
}

html.dark .prompt-chip[data-variant="default"] {
  background-color: color-mix(in srgb, var(--slidev-theme-secondary, #2dd4bf) 22%, transparent);
  color: var(--slidev-theme-secondary-light, #ecfdf5);
  border-color: color-mix(in srgb, var(--slidev-theme-secondary, #2dd4bf) 60%, transparent);
  box-shadow: 0 12px 24px -20px color-mix(in srgb, var(--slidev-theme-secondary, #2dd4bf) 60%, transparent);
}

/* Primary variant */
.prompt-chip[data-variant="primary"] {
  background-color: var(--slidev-theme-primary-light, #dbeafe);
  color: var(--slidev-theme-primary-dark, #1e3a8a);
  border-color: color-mix(in srgb, var(--slidev-theme-primary) 55%, transparent);
  box-shadow: 0 12px 24px -18px color-mix(in srgb, var(--slidev-theme-primary) 65%, transparent);
}

html.dark .prompt-chip[data-variant="primary"] {
  background-color: color-mix(in srgb, var(--slidev-theme-primary) 22%, transparent);
  color: var(--slidev-theme-primary-light, #dbeafe);
  border-color: color-mix(in srgb, var(--slidev-theme-primary) 60%, transparent);
  box-shadow: 0 12px 24px -20px color-mix(in srgb, var(--slidev-theme-primary) 60%, transparent);
}

/* Secondary variant (same as default, for consistency) */
.prompt-chip[data-variant="secondary"] {
  background-color: var(--slidev-theme-secondary-light, #d1fae5);
  color: var(--slidev-theme-secondary-dark, #0b3a2c);
  border-color: color-mix(in srgb, var(--slidev-theme-secondary, #14b8a6) 55%, transparent);
  box-shadow: 0 12px 24px -18px color-mix(in srgb, var(--slidev-theme-secondary, #14b8a6) 65%, transparent);
}

html.dark .prompt-chip[data-variant="secondary"] {
  background-color: color-mix(in srgb, var(--slidev-theme-secondary, #2dd4bf) 22%, transparent);
  color: var(--slidev-theme-secondary-light, #ecfdf5);
  border-color: color-mix(in srgb, var(--slidev-theme-secondary, #2dd4bf) 60%, transparent);
  box-shadow: 0 12px 24px -20px color-mix(in srgb, var(--slidev-theme-secondary, #2dd4bf) 60%, transparent);
}

/* Accent variant */
.prompt-chip[data-variant="accent"] {
  background-color: color-mix(in srgb, var(--slidev-theme-accent, #8b5cf6) 15%, white);
  color: var(--slidev-theme-accent-dark, #5b21b6);
  border-color: color-mix(in srgb, var(--slidev-theme-accent, #8b5cf6) 55%, transparent);
  box-shadow: 0 12px 24px -18px color-mix(in srgb, var(--slidev-theme-accent, #8b5cf6) 65%, transparent);
}

html.dark .prompt-chip[data-variant="accent"] {
  background-color: color-mix(in srgb, var(--slidev-theme-accent, #8b5cf6) 22%, transparent);
  color: color-mix(in srgb, var(--slidev-theme-accent, #8b5cf6) 80%, white);
  border-color: color-mix(in srgb, var(--slidev-theme-accent, #8b5cf6) 60%, transparent);
  box-shadow: 0 12px 24px -20px color-mix(in srgb, var(--slidev-theme-accent, #8b5cf6) 60%, transparent);
}
</style>
