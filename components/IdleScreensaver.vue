<template>
  <Teleport to="body">
    <Transition name="screensaver-fade">
      <div
        v-if="isActive"
        ref="overlayRef"
        class="idle-screensaver"
        role="presentation"
      >
        <div
          v-if="debug"
          class="idle-screensaver__debug"
          :style="debugStyle"
        />
        <img
          ref="logoRef"
          :src="resolvedImageSrc"
          :alt="imageAlt"
          class="idle-screensaver__logo"
          :style="logoStyle"
        />
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { useNav, useSlideContext } from '@slidev/client'
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'

defineOptions({ name: 'IdleScreensaver' })

const props = withDefaults(
  defineProps<{
    imageSrc?: string
    imageAlt?: string
    idleDelay?: number
    speed?: number
    debug?: boolean
  }>(),
  {
    imageAlt: 'Logo screensaver',
    idleDelay: 15_000,
    speed: 260,
    debug: false,
  },
)

const { $slidev } = useSlideContext()
const { currentSlideNo } = useNav()

// Get global config from frontmatter if component used without props
const config = computed(() => $slidev.configs.idleScreensaver || {})
const globalEnabled = computed(() => config.value.enabled === true)
const enableOnSlides = computed(() => config.value.enableOnSlides || 'cover')

// Determine if component should be active based on config or props
const shouldEnableOnCurrentSlide = computed(() => {
  const currentSlide = Number(currentSlideNo?.value ?? 1)
  // If used manually with imageSrc prop, always enable on that slide
  if (props.imageSrc) return true

  // If global config is disabled, don't enable
  if (!globalEnabled.value) return false

  // Check enableOnSlides config
  const target = enableOnSlides.value
  if (target === 'all') return true
  if (target === 'cover') return currentSlide === 1
  if (Array.isArray(target)) return target.includes(currentSlide)

  return false
})

// Use prop or config for image source
const finalImageSrc = computed(() => props.imageSrc || config.value.imageSrc)
const finalIdleDelay = computed(() => props.idleDelay || config.value.idleDelay || 15_000)
const finalSpeed = computed(() => props.speed || config.value.speed || 260)

const isActive = ref(false)
const overlayRef = ref<HTMLElement | null>(null)
const logoRef = ref<HTMLImageElement | null>(null)
const position = reactive({ x: 0, y: 0 })
const velocity = reactive({ x: 0, y: 0 })
const bounds = reactive({ left: 0, top: 0, width: 0, height: 0 })

let idleTimer: number | null = null
let frameId: number | null = null
let lastTimestamp = 0
let listenersAttached = false

const logoStyle = computed(() => ({
  transform: `translate3d(${position.x + bounds.left}px, ${position.y + bounds.top}px, 0)`,
}))

const debugStyle = computed(() => ({
  transform: `translate3d(${bounds.left}px, ${bounds.top}px, 0)`,
  width: `${bounds.width}px`,
  height: `${bounds.height}px`,
}))

const externalSrcPattern = /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i
const resolvedImageSrc = computed(() => resolveImageSrc(finalImageSrc.value))

function resolveImageSrc(src: string | undefined): string {
  if (!src) return ''
  if (externalSrcPattern.test(src) || src.startsWith('data:') || src.startsWith('blob:')) {
    return src
  }

  const baseUrl = new URL(import.meta.env.BASE_URL || '/', 'http://slidev.local')
  const normalizedSrc = src.replace(/^(\.\/)+/, '').replace(/^\/+/, '')

  try {
    const url = new URL(normalizedSrc, baseUrl)
    return url.href.replace(baseUrl.origin, '')
  } catch {
    return src
  }
}

const activityEvents = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'pointerdown', 'wheel']

function handleActivity() {
  if (typeof window === 'undefined') return
  if (isActive.value) {
    deactivate()
  }
  startIdleTimer()
}

function handleVisibilityChange() {
  if (typeof document === 'undefined') return
  if (document.visibilityState === 'visible') {
    handleActivity()
  } else {
    deactivate()
    stopIdleTimer()
  }
}

function startIdleTimer() {
  if (typeof window === 'undefined') return
  stopIdleTimer()
  const delay = props.debug ? 0 : finalIdleDelay.value
  idleTimer = window.setTimeout(activate, delay)
}

function stopIdleTimer() {
  if (idleTimer !== null) {
    window.clearTimeout(idleTimer)
    idleTimer = null
  }
}

function activate() {
  if (!finalImageSrc.value) {
    console.warn('IdleScreensaver: No image source provided')
    return
  }

  isActive.value = true
  seedVelocity()
  lastTimestamp = 0
  measureBounds()
  nextTick(() => {
    placeLogoRandomly()
    startAnimation()
  })
}

function deactivate() {
  isActive.value = false
  stopAnimation()
}

function placeLogoRandomly() {
  if (!overlayRef.value || !logoRef.value) return
  const { width: containerWidth, height: containerHeight } = measureBounds()
  const logoWidth = logoRef.value.clientWidth
  const logoHeight = logoRef.value.clientHeight
  const maxX = Math.max(containerWidth - logoWidth, 0)
  const maxY = Math.max(containerHeight - logoHeight, 0)
  position.x = Math.random() * (maxX || 1)
  position.y = Math.random() * (maxY || 1)
}

function clampPosition() {
  if (!overlayRef.value || !logoRef.value) return
  const { width: containerWidth, height: containerHeight } = measureBounds()
  const logoWidth = logoRef.value.clientWidth
  const logoHeight = logoRef.value.clientHeight
  const maxX = Math.max(containerWidth - logoWidth, 0)
  const maxY = Math.max(containerHeight - logoHeight, 0)
  position.x = Math.min(Math.max(position.x, 0), maxX)
  position.y = Math.min(Math.max(position.y, 0), maxY)
}

function measureBounds() {
  if (typeof window === 'undefined') {
    bounds.left = 0
    bounds.top = 0
    bounds.width = overlayRef.value?.clientWidth || 0
    bounds.height = overlayRef.value?.clientHeight || 0
    return bounds
  }

  const selectors = [
    '.slidev-page.current',
    '.slidev-page.enter',
    '.slidev-page.leave',
    '.slidev-page',
    '.slidev-layout',
  ]

  for (const selector of selectors) {
    const target = document.querySelector(selector)
    if (target) {
      const rect = target.getBoundingClientRect()
      bounds.left = rect.left
      bounds.top = rect.top
      bounds.width = rect.width
      bounds.height = rect.height
      return bounds
    }
  }

  bounds.left = 0
  bounds.top = 0
  bounds.width = window.innerWidth
  bounds.height = window.innerHeight
  return bounds
}

function seedVelocity() {
  const angle = Math.random() * Math.PI * 2
  const baseSpeed = finalSpeed.value
  const minComponent = baseSpeed * 0.35
  velocity.x = Math.cos(angle) * baseSpeed
  velocity.y = Math.sin(angle) * baseSpeed

  if (Math.abs(velocity.x) < minComponent) {
    velocity.x = (Math.sign(velocity.x) || 1) * minComponent
  }

  if (Math.abs(velocity.y) < minComponent) {
    velocity.y = (Math.sign(velocity.y) || 1) * minComponent
  }
}

function step(timestamp: number) {
  if (!isActive.value || !overlayRef.value || !logoRef.value) {
    return
  }

  if (!lastTimestamp) {
    lastTimestamp = timestamp
  }

  const delta = (timestamp - lastTimestamp) / 1000
  lastTimestamp = timestamp

  const { width: containerWidth, height: containerHeight } = measureBounds()
  const logoWidth = logoRef.value.clientWidth
  const logoHeight = logoRef.value.clientHeight
  const maxX = Math.max(containerWidth - logoWidth, 0)
  const maxY = Math.max(containerHeight - logoHeight, 0)

  position.x += velocity.x * delta
  position.y += velocity.y * delta

  if (position.x <= 0) {
    position.x = 0
    velocity.x = Math.abs(velocity.x)
  } else if (position.x >= maxX) {
    position.x = maxX
    velocity.x = -Math.abs(velocity.x)
  }

  if (position.y <= 0) {
    position.y = 0
    velocity.y = Math.abs(velocity.y)
  } else if (position.y >= maxY) {
    position.y = maxY
    velocity.y = -Math.abs(velocity.y)
  }

  frameId = window.requestAnimationFrame(step)
}

function startAnimation() {
  stopAnimation()
  frameId = window.requestAnimationFrame(step)
}

function stopAnimation() {
  if (frameId !== null) {
    window.cancelAnimationFrame(frameId)
    frameId = null
  }
}

function addActivityListeners() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return
  if (listenersAttached) return
  listenersAttached = true
  activityEvents.forEach((eventName) => {
    window.addEventListener(eventName, handleActivity, { passive: true })
  })
  window.addEventListener('focus', handleActivity)
  window.addEventListener('resize', clampPosition)
  document.addEventListener('visibilitychange', handleVisibilityChange)
}

function removeActivityListeners() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return
  if (!listenersAttached) return
  listenersAttached = false
  activityEvents.forEach((eventName) => {
    window.removeEventListener(eventName, handleActivity)
  })
  window.removeEventListener('focus', handleActivity)
  window.removeEventListener('resize', clampPosition)
  document.removeEventListener('visibilitychange', handleVisibilityChange)
}

onMounted(() => {
  if (typeof window === 'undefined') return
  watch(
    shouldEnableOnCurrentSlide,
    (active) => {
      if (active) {
        measureBounds()
        addActivityListeners()
        startIdleTimer()
      } else {
        stopIdleTimer()
        deactivate()
        removeActivityListeners()
      }
    },
    { immediate: true },
  )
})

onBeforeUnmount(() => {
  stopIdleTimer()
  stopAnimation()
  deactivate()
  removeActivityListeners()
})
</script>

<style scoped>
.idle-screensaver {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: flex-start;
  justify-content: flex-start;
  overflow: hidden;
  pointer-events: none;
  z-index: 9999;
}

.idle-screensaver__logo {
  position: absolute;
  width: min(38vw, 320px);
  max-width: 320px;
  height: auto;
  transition: transform 0.1s linear;
  will-change: transform;
  filter: drop-shadow(0 12px 24px rgba(0, 0, 0, 0.35));
}

.idle-screensaver__debug {
  position: absolute;
  border: 3px dashed rgba(0, 200, 255, 0.7);
  pointer-events: none;
  box-sizing: border-box;
}

.screensaver-fade-enter-active,
.screensaver-fade-leave-active {
  transition: opacity 200ms ease;
}

.screensaver-fade-enter-from,
.screensaver-fade-leave-to {
  opacity: 0;
}
</style>
