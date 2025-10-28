<template>
  <div ref="container" :class="['copy-code-container', wrapperClass]">
    <slot />
    <div class="copy-code-button-wrapper">
      <button
        type="button"
        :aria-label="ariaLabel"
        :aria-live="copied ? 'polite' : 'off'"
        class="copy-code-button"
        :class="{ 'is-copied': copied }"
        @click="handleCopy"
      >
        <span class="copy-code-icon" :class="copied ? 'i-la-check-circle' : 'i-la-copy'" />
        <span>{{ copied ? copiedLabel : copyLabel }}</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useClipboard } from '@vueuse/core'
import { ref } from 'vue'

defineOptions({ name: 'CopyCodeBlock' })

const props = withDefaults(
  defineProps<{
    selector?: string
    trim?: boolean
    wrapperClass?: string | string[] | Record<string, boolean>
    copyLabel?: string
    copiedLabel?: string
    ariaLabel?: string
    copiedTimeout?: number
  }>(),
  {
    selector: 'pre code',
    trim: true,
    wrapperClass: 'mt-6 space-y-3',
    copyLabel: 'Copy code',
    copiedLabel: 'Copied!',
    ariaLabel: 'Copy code snippet',
    copiedTimeout: 2000,
  },
)

const container = ref<HTMLElement | null>(null)
const { copy, copied } = useClipboard({ legacy: true })

const _handleCopy = async () => {
  const host = container.value
  if (!host) return

  const codeElement = host.querySelector(props.selector)
  const raw = codeElement?.textContent
  if (!raw) return

  await copy(props.trim ? raw.trim() : raw)

  // Auto-reset copied state after timeout
  setTimeout(() => {
    copied.value = false
  }, props.copiedTimeout)
}
</script>

<style scoped>
.copy-code-container {
  position: relative;
}

.copy-code-button-wrapper {
  @apply flex justify-end mt-2;
}

.copy-code-button {
  @apply inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs font-semibold transition-all;
  @apply focus-visible:outline-none;

  border-color: color-mix(in srgb, var(--slidev-theme-primary) 45%, transparent);
  background-color: color-mix(
    in srgb,
    var(--slidev-code-background, #1e1e1e) 82%,
    var(--slidev-theme-primary) 18%
  );
  color: var(--slidev-code-foreground, #d4d4d4);
  box-shadow: 0 4px 12px -10px color-mix(in srgb, var(--slidev-theme-primary) 50%, transparent);
  transition-property: color, background-color, border-color, box-shadow, transform;
  transition-duration: 150ms;
  transition-timing-function: ease;
}

.copy-code-button:not(.is-copied):hover {
  background-color: color-mix(
    in srgb,
    var(--slidev-code-background, #1e1e1e) 65%,
    var(--slidev-theme-primary) 35%
  );
  transform: translateY(-1px);
}

.copy-code-button:focus-visible {
  outline: 2px solid color-mix(in srgb, var(--slidev-theme-primary) 65%, transparent);
  outline-offset: 2px;
}

.copy-code-button.is-copied {
  background-color: color-mix(in srgb, var(--slidev-theme-primary) 90%, black 10%);
  border-color: color-mix(in srgb, var(--slidev-theme-primary) 70%, transparent);
  color: color-mix(in srgb, white 88%, var(--slidev-theme-primary) 12%);
  box-shadow: 0 6px 18px -12px color-mix(in srgb, var(--slidev-theme-primary) 75%, black 25%);
}

.copy-code-button.is-copied:hover {
  background-color: color-mix(in srgb, var(--slidev-theme-primary) 95%, black 5%);
  transform: none;
}

.copy-code-icon {
  @apply text-base leading-none;
}

@media (prefers-reduced-motion: reduce) {
  .copy-code-button {
    transition-duration: 0ms;
  }
}
</style>
