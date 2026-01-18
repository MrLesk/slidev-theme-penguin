<template>
  <div class="line-chart" :style="containerStyle">
    <Line :data="data" :options="mergedOptions" :plugins="plugins" :chart-id="chartId" />
  </div>
</template>

<script setup lang="ts">
import type { ChartData, ChartOptions, Plugin } from 'chart.js'
import { Chart as ChartJS, registerables } from 'chart.js'
import { computed } from 'vue'
import { Line } from 'vue-chartjs'

ChartJS.register(...registerables)

defineOptions({ name: 'LineChart' })

// Usage: <LineChart :data="chartData" :options="chartOptions" :height="320" />
const props = withDefaults(
  defineProps<{
    data: ChartData<'line'>
    options?: ChartOptions<'line'>
    plugins?: Plugin<'line'>[]
    height?: number | string
    width?: number | string
    chartId?: string
  }>(),
  {
    options: undefined,
    plugins: undefined,
    height: 320,
    width: undefined,
    chartId: undefined,
  },
)

const mergedOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  ...props.options,
}))

const containerStyle = computed(() => {
  const style: Record<string, string> = {
    height: typeof props.height === 'number' ? `${props.height}px` : props.height,
    width: '100%',
  }

  if (props.width) {
    style.width = typeof props.width === 'number' ? `${props.width}px` : props.width
  }

  return style
})
</script>

<style scoped>
.line-chart {
  position: relative;
  display: block;
}
</style>
