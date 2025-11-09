<template>
  <div
    class="card-component relative inline-flex max-w-full flex-col rounded-3xl border px-6 py-4 shadow-lg backdrop-blur-xl"
    :class="[containerVariantClass, gradientClass, blurClass]"
    :style="accentStyle"
  >
    <header
      v-if="hasHeader"
      class="mb-3 inline-flex items-center gap-2 self-start rounded-full px-3 py-1 text-[0.75rem] font-semibold uppercase tracking-[0.12em]"
      :class="badgeVariantClass"
    >
      <span v-if="icon" class="text-base leading-none">{{ icon }}</span>
      <span v-if="title" class="leading-none">{{ title }}</span>
    </header>
    <div class="text-base leading-relaxed">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

defineOptions({ name: 'Card' })

const props = withDefaults(
  defineProps<{
    title?: string
    icon?: string
    variant?: 'default' | 'critical' | 'success' | 'warning' | 'info'
    gradient?: boolean
    blur?: boolean
    borderWidth?: number
    accent?: string
  }>(),
  {
    variant: 'default',
    gradient: true,
    blur: true,
    borderWidth: 6,
    accent: undefined,
  },
)

const hasHeader = computed(() => Boolean(props.title) || Boolean(props.icon))

const gradientClass = computed(() => (props.gradient ? 'card-gradient' : 'card-solid'))
const blurClass = computed(() => (props.blur ? 'card-blur' : ''))
const accentStyle = computed(() => (props.accent ? { '--card-accent': props.accent } : undefined))

const variantStyles = computed(() => {
  const baseBadge = 'badge-default'

  if (!props.variant || props.variant === 'default') {
    return {
      container: '',
      badge: baseBadge,
    }
  }

  switch (props.variant) {
    case 'critical':
      return {
        container: 'variant-critical',
        badge: 'badge-critical',
      }
    case 'success':
      return {
        container: 'variant-success',
        badge: 'badge-success',
      }
    case 'warning':
      return {
        container: 'variant-warning',
        badge: 'badge-warning',
      }
    case 'info':
      return {
        container: 'variant-info',
        badge: 'badge-info',
      }
    default:
      return {
        container: '',
        badge: baseBadge,
      }
  }
})

const containerVariantClass = computed(() => variantStyles.value.container)
const badgeVariantClass = computed(() => variantStyles.value.badge)
</script>

<style scoped>
.card-component {
  --card-accent: var(--slidev-theme-secondary, #10b981);
  --card-border-color: color-mix(in srgb, var(--card-accent) 20%, transparent);
  --card-bg-from: color-mix(in srgb, white 95%, transparent);
  --card-bg-via: color-mix(in srgb, white 90%, transparent);
  --card-bg-to: color-mix(in srgb, var(--card-accent) 8%, white);
  --card-text: var(--slidev-theme-foreground, #1e293b);

  border-color: var(--card-border-color);
  color: var(--card-text);
}

html.dark .card-component {
  --card-border-color: color-mix(in srgb, var(--card-accent) 30%, transparent);
  --card-bg-from: color-mix(in srgb, #0f172a 80%, transparent);
  --card-bg-via: color-mix(in srgb, #0f172a 70%, transparent);
  --card-bg-to: color-mix(in srgb, var(--card-accent) 15%, #0f172a);
  --card-text: var(--slidev-theme-foreground, #f1f5f9);
}

.card-gradient {
  background: linear-gradient(to bottom right, var(--card-bg-from), var(--card-bg-via), var(--card-bg-to));
}

.card-solid {
  background-color: var(--card-bg-from);
}

.card-blur {
  backdrop-filter: blur(10px);
}

/* Variant: Critical */
.variant-critical {
  --card-error: var(--slidev-theme-error, #e11d48);
  border-left: v-bind(borderWidth + 'px') solid var(--card-error);
}

/* Variant: Success */
.variant-success {
  --card-success: var(--slidev-theme-success, #10b981);
  border-left: v-bind(borderWidth + 'px') solid var(--card-success);
}

/* Variant: Warning */
.variant-warning {
  --card-warning: var(--slidev-theme-warning, #f59e0b);
  border-left: v-bind(borderWidth + 'px') solid var(--card-warning);
}

/* Variant: Info */
.variant-info {
  --card-info: var(--slidev-theme-info, #3b82f6);
  border-left: v-bind(borderWidth + 'px') solid var(--card-info);
}

/* Badge variants */
.badge-default {
  background-color: color-mix(in srgb, var(--card-accent) 15%, white);
  color: color-mix(in srgb, var(--card-accent) 90%, black);
}

html.dark .badge-default {
  background-color: color-mix(in srgb, var(--card-accent) 20%, transparent);
  color: color-mix(in srgb, var(--card-accent) 95%, white);
}

.badge-critical {
  background-color: color-mix(in srgb, var(--slidev-theme-error, #e11d48) 15%, white);
  color: color-mix(in srgb, var(--slidev-theme-error, #e11d48) 90%, black);
}

html.dark .badge-critical {
  background-color: color-mix(in srgb, var(--slidev-theme-error, #e11d48) 20%, transparent);
  color: color-mix(in srgb, var(--slidev-theme-error, #e11d48) 95%, white);
}

.badge-success {
  background-color: color-mix(in srgb, var(--slidev-theme-success, #10b981) 15%, white);
  color: color-mix(in srgb, var(--slidev-theme-success, #10b981) 90%, black);
}

html.dark .badge-success {
  background-color: color-mix(in srgb, var(--slidev-theme-success, #10b981) 25%, transparent);
  color: color-mix(in srgb, var(--slidev-theme-success, #10b981) 95%, white);
}

.badge-warning {
  background-color: color-mix(in srgb, var(--slidev-theme-warning, #f59e0b) 15%, white);
  color: color-mix(in srgb, var(--slidev-theme-warning, #f59e0b) 90%, black);
}

html.dark .badge-warning {
  background-color: color-mix(in srgb, var(--slidev-theme-warning, #f59e0b) 25%, transparent);
  color: color-mix(in srgb, var(--slidev-theme-warning, #f59e0b) 95%, white);
}

.badge-info {
  background-color: color-mix(in srgb, var(--slidev-theme-info, #3b82f6) 15%, white);
  color: color-mix(in srgb, var(--slidev-theme-info, #3b82f6) 90%, black);
}

html.dark .badge-info {
  background-color: color-mix(in srgb, var(--slidev-theme-info, #3b82f6) 25%, transparent);
  color: color-mix(in srgb, var(--slidev-theme-info, #3b82f6) 95%, white);
}
</style>
