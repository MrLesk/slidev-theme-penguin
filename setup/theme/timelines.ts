import { computed } from 'vue'

export interface TimelineStep {
  id: string
  label: string
  description?: string
  icon?: string
}

export interface TimelineDefinition {
  steps: TimelineStep[]
  current?: string | number
}

export interface TimelineFrontmatter extends Partial<TimelineDefinition> {
  preset?: string
}

export interface ResolvedTimeline {
  steps: TimelineStep[]
  currentIndex: number
  currentStep: TimelineStep
}

export type TimelinePresetMap = Record<string, TimelineDefinition>

const defaultPresets: TimelinePresetMap = {
  // No default presets - users should define their own in slides.md frontmatter
}

export function useTimelineResolver(presetsFromTheme?: TimelinePresetMap) {
  const allPresets = computed(() => ({
    ...defaultPresets,
    ...(presetsFromTheme ?? {}),
  }))

  function resolve(timeline?: TimelineFrontmatter | string | boolean | null): ResolvedTimeline | null {
    if (!timeline || timeline === false)
      return null

    const normalized = typeof timeline === 'string'
      ? { preset: timeline }
      : timeline

    const presetName = normalized?.preset
    const preset = presetName ? allPresets.value[presetName] : undefined

    const steps = normalized?.steps?.length
      ? normalized.steps
      : preset?.steps

    if (!steps || !steps.length)
      return null

    const currentIndex = resolveCurrentIndex(normalized?.current, steps)
    const currentStep = steps[currentIndex]

    return {
      steps,
      currentIndex,
      currentStep,
    }
  }

  return {
    resolve,
    presets: allPresets,
  }
}

function resolveCurrentIndex(current: TimelineDefinition['current'], steps: TimelineStep[]) {
  if (typeof current === 'number' && Number.isFinite(current))
    return clampIndex(current, steps.length)

  if (typeof current === 'string') {
    const normalized = normalizeId(current)
    const matchIndex = steps.findIndex((step) => normalizeId(step.id) === normalized || normalizeId(step.label) === normalized)
    if (matchIndex >= 0)
      return clampIndex(matchIndex, steps.length)
  }

  return 0
}

function clampIndex(index: number, length: number) {
  if (!length)
    return 0
  const max = Math.max(0, length - 1)
  const value = Math.floor(index)
  if (Number.isNaN(value))
    return 0
  return Math.min(Math.max(value, 0), max)
}

function normalizeId(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/(^-|-$)/g, '')
}

export type { TimelinePresetMap as TimelinePresets }
