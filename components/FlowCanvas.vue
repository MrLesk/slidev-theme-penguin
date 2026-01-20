<template>
  <div class="flow-canvas" :style="containerStyle">
    <VueFlow
      :id="resolvedId"
      :nodes="internalNodes"
      :edges="internalEdges"
      :class="['flow-canvas__viewport', { 'flow-canvas__viewport--transparent': transparent }]"
      v-bind="mergedFlowProps"
      @init="handleInit"
    >
      <Background v-if="background" v-bind="backgroundProps" />
      <Controls v-if="controls" v-bind="controlsProps" />
      <slot />
    </VueFlow>
  </div>
</template>

<script setup lang="ts">
import { useSlideContext } from '@slidev/client'
import { VueFlow, useVueFlow } from '@vue-flow/core'
import type {
  Edge,
  FitViewParams,
  FlowProps,
  Node,
  TransitionOptions,
  ViewportTransform,
} from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import type { BackgroundProps } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import type { ControlProps } from '@vue-flow/controls'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

defineOptions({ name: 'FlowCanvas' })

type NodeUpdate = Partial<Node> & { id: Node['id'] }
type EdgeUpdate = Partial<Edge> & { id: Edge['id'] }

export type FlowStep = {
  nodes?: Node[]
  edges?: Edge[]
  addNodes?: Node[]
  addEdges?: Edge[]
  updateNodes?: NodeUpdate[]
  updateEdges?: EdgeUpdate[]
  removeNodes?: string[]
  removeEdges?: string[]
  selectNodes?: string[]
  selectEdges?: string[]
  deselectNodes?: string[]
  deselectEdges?: string[]
  clearSelection?: boolean
  viewport?: ViewportTransform
  viewportTransition?: TransitionOptions
  fitView?: boolean | FitViewParams
}

// Usage:
// <FlowCanvas :nodes="nodes" :edges="edges" :steps="steps" :click-offset="1" :height="360" />
const props = withDefaults(
  defineProps<{
    id?: string
    nodes?: Node[]
    edges?: Edge[]
    steps?: FlowStep[]
    clickOffset?: number
    height?: number | string
    width?: number | string
    flowProps?: Omit<FlowProps, 'nodes' | 'edges' | 'modelValue'>
    background?: boolean
    backgroundProps?: BackgroundProps
    controls?: boolean
    controlsProps?: ControlProps
    transparent?: boolean
  }>(),
  {
    id: undefined,
    nodes: () => [],
    edges: () => [],
    steps: () => [],
    clickOffset: 0,
    height: 360,
    width: '100%',
    flowProps: () => ({}),
    background: true,
    backgroundProps: () => ({
      variant: 'dots',
      gap: 24,
      size: 1,
    }),
    controls: false,
    controlsProps: () => ({}),
    transparent: false,
  },
)

const autoId = `flow-${Math.random().toString(36).slice(2, 10)}`
const resolvedId = props.id ?? props.flowProps?.id ?? autoId
const flowStore = useVueFlow(resolvedId)
const { $clicks } = useSlideContext()

const internalNodes = ref<Node[]>(cloneValue(props.nodes))
const internalEdges = ref<Edge[]>(cloneValue(props.edges))
const baseNodes = ref<Node[]>(cloneValue(props.nodes))
const baseEdges = ref<Edge[]>(cloneValue(props.edges))
const isReady = ref(false)

const mergedFlowProps = computed<Partial<FlowProps>>(() => ({
  nodesDraggable: false,
  nodesConnectable: false,
  edgesUpdatable: false,
  elementsSelectable: false,
  zoomOnScroll: false,
  panOnScroll: false,
  panOnDrag: false,
  zoomOnDoubleClick: false,
  preventScrolling: false,
  fitViewOnInit: true,
  ...props.flowProps,
}))

const containerStyle = computed(() => {
  const style: Record<string, string> = {}
  const inverseScale = slideScale.value ? 1 / slideScale.value : 1

  style.transform = `scale(${inverseScale})`
  style.transformOrigin = 'top left'

  if (props.height != null) {
    if (typeof props.height === 'number') {
      style.height = `${props.height * slideScale.value}px`
    } else {
      style.height = `calc(${props.height} * ${slideScale.value})`
    }
  }

  if (props.width != null) {
    if (typeof props.width === 'number') {
      style.width = `${props.width * slideScale.value}px`
    } else {
      style.width = `calc(${props.width} * ${slideScale.value})`
    }
  }

  return style
})

const slideScale = ref(1)

function updateSlideScale() {
  if (typeof window === 'undefined') return
  const rootStyle = window.getComputedStyle(document.documentElement)
  const raw = rootStyle.getPropertyValue('--slidev-slide-scale').trim()
  const parsed = Number.parseFloat(raw)
  slideScale.value = Number.isFinite(parsed) && parsed > 0 ? parsed : 1
}

onMounted(() => {
  updateSlideScale()
  window.addEventListener('resize', updateSlideScale)
})

onBeforeUnmount(() => {
  if (typeof window === 'undefined') return
  window.removeEventListener('resize', updateSlideScale)
})

const activeStepIndex = computed(() => {
  if (!props.steps?.length) return -1

  const clicksValue = $clicks?.value ?? 0
  const raw = clicksValue - props.clickOffset

  if (raw < 0) return -1

  return Math.min(raw, props.steps.length - 1)
})

let pendingViewport: { viewport: ViewportTransform; transition?: TransitionOptions } | null = null
let pendingFitView: FitViewParams | null = null

function handleInit() {
  isReady.value = true
  applySteps(activeStepIndex.value)
  runViewportActions()
  scheduleNodeUpdate()
}

if (typeof document !== 'undefined' && document.fonts?.ready) {
  document.fonts.ready.then(() => {
    scheduleNodeUpdate()
  })
}

watch(
  () => props.nodes,
  (value) => {
    const next = cloneValue(value)
    baseNodes.value = next
    internalNodes.value = cloneValue(next)
    applySteps(activeStepIndex.value)
  },
  { deep: true },
)

watch(
  () => props.edges,
  (value) => {
    const next = cloneValue(value)
    baseEdges.value = next
    internalEdges.value = cloneValue(next)
    applySteps(activeStepIndex.value)
  },
  { deep: true },
)

watch(
  () => props.steps,
  () => {
    applySteps(activeStepIndex.value)
  },
  { deep: true },
)

watch(
  activeStepIndex,
  () => {
    applySteps(activeStepIndex.value)
  },
  { immediate: true },
)

function applySteps(stepIndex: number) {
  let nextNodes = cloneValue(baseNodes.value)
  let nextEdges = cloneValue(baseEdges.value)

  pendingViewport = null
  pendingFitView = null

  if (stepIndex >= 0 && props.steps?.length) {
    for (let i = 0; i <= stepIndex; i += 1) {
      const step = props.steps[i]
      if (!step) continue

      if (step.nodes) nextNodes = cloneValue(step.nodes)
      if (step.edges) nextEdges = cloneValue(step.edges)

      if (step.addNodes?.length) nextNodes.push(...cloneValue(step.addNodes))
      if (step.addEdges?.length) nextEdges.push(...cloneValue(step.addEdges))

      if (step.updateNodes?.length) applyNodeUpdates(nextNodes, step.updateNodes)
      if (step.updateEdges?.length) applyEdgeUpdates(nextEdges, step.updateEdges)

      if (step.removeNodes?.length) {
        const removeIds = new Set(step.removeNodes)
        nextNodes = nextNodes.filter((node) => !removeIds.has(node.id))
      }

      if (step.removeEdges?.length) {
        const removeIds = new Set(step.removeEdges)
        nextEdges = nextEdges.filter((edge) => !removeIds.has(edge.id))
      }

      if (step.clearSelection) {
        nextNodes.forEach((node) => {
          node.selected = false
        })
        nextEdges.forEach((edge) => {
          edge.selected = false
        })
      }

      if (step.selectNodes?.length) {
        const selectIds = new Set(step.selectNodes)
        nextNodes.forEach((node) => {
          if (selectIds.has(node.id)) node.selected = true
        })
      }

      if (step.selectEdges?.length) {
        const selectIds = new Set(step.selectEdges)
        nextEdges.forEach((edge) => {
          if (selectIds.has(edge.id)) edge.selected = true
        })
      }

      if (step.deselectNodes?.length) {
        const selectIds = new Set(step.deselectNodes)
        nextNodes.forEach((node) => {
          if (selectIds.has(node.id)) node.selected = false
        })
      }

      if (step.deselectEdges?.length) {
        const selectIds = new Set(step.deselectEdges)
        nextEdges.forEach((edge) => {
          if (selectIds.has(edge.id)) edge.selected = false
        })
      }

      if (step.viewport) {
        pendingViewport = {
          viewport: step.viewport,
          transition: step.viewportTransition,
        }
      }

      if (step.fitView) {
        pendingFitView = step.fitView === true ? {} : step.fitView
      }
    }
  }

  internalNodes.value = nextNodes
  internalEdges.value = nextEdges

  runViewportActions()
}

function runViewportActions() {
  if (!isReady.value) return
  if (!pendingViewport && !pendingFitView) return

  const viewportAction = pendingViewport
  const fitViewAction = pendingFitView

  pendingViewport = null
  pendingFitView = null

  void nextTick(() => {
    scheduleNodeUpdate()
    if (viewportAction) {
      void flowStore.setViewport(viewportAction.viewport, viewportAction.transition)
    }

    if (fitViewAction) {
      void flowStore.fitView(fitViewAction)
    }
  })
}

function scheduleNodeUpdate() {
  flowStore.updateNodeInternals()
  if (typeof requestAnimationFrame !== 'undefined') {
    requestAnimationFrame(() => {
      flowStore.updateNodeInternals()
      updateEdgeAlignment()
    })
  }
  setTimeout(() => {
    flowStore.updateNodeInternals()
    updateEdgeAlignment()
  }, 60)
}

function updateEdgeAlignment() {
  if (typeof document === 'undefined') return
  const root = document.querySelector('.flow-canvas')
  if (!root) return
  const path = root.querySelector('.vue-flow__edges path')
  if (!path) return
  const sourceId = path.getAttribute('source')
  if (!sourceId) return
  const handle = root.querySelector(`.vue-flow__node[data-id="${sourceId}"] .vue-flow__handle-right`)
  if (!handle) return
  const handleRect = handle.getBoundingClientRect()
  const handleCenterY = handleRect.y + handleRect.height / 2
  const length = path.getTotalLength()
  const start = path.getPointAtLength(0)
  const ctm = path.getScreenCTM()
  if (!ctm) return
  const pathStartY = start.x * ctm.b + start.y * ctm.d + ctm.f
  const offset = handleCenterY - pathStartY
  if (Number.isFinite(offset)) {
    edgeOffsetY.value = offset
  }
}

function applyNodeUpdates(nodes: Node[], updates: NodeUpdate[]) {
  for (const patch of updates) {
    const index = nodes.findIndex((node) => node.id === patch.id)
    if (index < 0) continue

    const current = nodes[index]
    const nextData = mergeData(current.data, patch.data)
    nodes[index] = {
      ...current,
      ...patch,
      data: nextData,
    }
  }
}

function applyEdgeUpdates(edges: Edge[], updates: EdgeUpdate[]) {
  for (const patch of updates) {
    const index = edges.findIndex((edge) => edge.id === patch.id)
    if (index < 0) continue

    const current = edges[index]
    const nextData = mergeData(current.data, patch.data)
    edges[index] = {
      ...current,
      ...patch,
      data: nextData,
    }
  }
}

function mergeData(current: unknown, patch: unknown) {
  if (patch === undefined) return current
  if (isPlainObject(current) && isPlainObject(patch)) {
    return { ...current, ...patch }
  }
  return patch
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}

function cloneValue<T>(value: T): T {
  if (value == null) return value
  if (typeof structuredClone === 'function') {
    try {
      return structuredClone(value)
    } catch {
      // Fall back to JSON clone for reactive proxies or non-cloneable values.
    }
  }
  return JSON.parse(JSON.stringify(value)) as T
}
</script>

<style scoped>
.flow-canvas {
  width: 100%;
}

.flow-canvas__viewport {
  width: 100%;
  height: 100%;
  border-radius: 18px;
  background: color-mix(in srgb, var(--slidev-theme-primary, #3e5166) 8%, white);
  border: 1px solid color-mix(in srgb, var(--slidev-theme-primary, #3e5166) 25%, transparent);
}

.flow-canvas__viewport--transparent {
  background: transparent;
  border-color: transparent;
}

.flow-canvas :deep(.vue-flow) {
  --vf-node-bg: color-mix(in srgb, var(--slidev-theme-primary, #3e5166) 12%, white);
  --vf-node-text: color-mix(in srgb, var(--slidev-theme-primary, #3e5166) 85%, black);
  --vf-node-color: var(--slidev-theme-primary, #3e5166);
  --vf-handle: var(--slidev-theme-secondary, #34d399);
  --vf-connection-path: var(--slidev-theme-primary, #3e5166);
  --vf-box-shadow: 0 12px 24px -20px color-mix(in srgb, var(--slidev-theme-primary, #3e5166) 45%, transparent);
}

.flow-canvas :deep(.vue-flow__edges),
.flow-canvas :deep(.vue-flow__edge-labels) {
  transform: translateY(var(--flow-edge-y-offset, 0px)) scaleX(var(--flow-inverse-scale, 1));
  transform-origin: top left;
}

.flow-canvas :deep(.vue-flow__node) {
  border-radius: 12px;
  border: 1px solid color-mix(in srgb, var(--slidev-theme-primary, #3e5166) 25%, transparent);
  padding: 8px 12px;
  font-weight: 600;
}

html.dark .flow-canvas__viewport {
  background: color-mix(in srgb, var(--slidev-theme-primary, #3e5166) 30%, #0f172a);
  border-color: color-mix(in srgb, var(--slidev-theme-primary, #3e5166) 40%, transparent);
}

html.dark .flow-canvas__viewport--transparent {
  background: transparent;
  border-color: transparent;
}

html.dark .flow-canvas :deep(.vue-flow) {
  --vf-node-bg: color-mix(in srgb, var(--slidev-theme-primary, #3e5166) 28%, #0f172a);
  --vf-node-text: color-mix(in srgb, #f8fafc 86%, var(--slidev-theme-primary, #3e5166));
  --vf-handle: var(--slidev-theme-secondary, #34d399);
  --vf-connection-path: color-mix(in srgb, var(--slidev-theme-secondary, #34d399) 70%, #f8fafc);
}
</style>
