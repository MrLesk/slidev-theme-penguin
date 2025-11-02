<script setup lang="ts">
import type { Highlighter } from 'shiki'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useSlideContext } from '@slidev/client'
import PenguinTheme from '../setup/theme/penguin-theme.json'

defineOptions({ name: 'MarkdownSectionViewer' })

const props = withDefaults(
  defineProps<{
    file: string
    sections?: string[]
    clickOffset?: number
    maxHeight?: string
    /**
     * Optional polling interval (ms) while the slide is active.
     * Handy when the file can be regenerated repeatedly.
     */
    refreshInterval?: number
  }>(),
  {
    clickOffset: 0,
    maxHeight: undefined,
    refreshInterval: 0,
  },
)

const { $clicks, $nav, $page } = useSlideContext()

const rawContent = ref('')
const renderedHtml = ref('')
const isLoading = ref(false)
const loadError = ref<string | null>(null)
const missingSections = ref<string[]>([])
const sectionRanges = ref<Array<{ label: string; startLine: number; endLine: number }>>([])
const codeWrapperRef = ref<HTMLElement | null>(null)

let refreshTimer: ReturnType<typeof setInterval> | null = null
let activeController: AbortController | null = null

const activeSlideNo = computed(() => $nav.value?.currentSlideNo?.value ?? 0)
const currentPageNo = computed(() => {
  const page = $page.value as unknown
  if (typeof page === 'number')
    return page
  if (page && typeof (page as { value?: unknown }).value === 'number')
    return (page as { value: number }).value
  return 0
})
const isActive = computed(() => activeSlideNo.value === currentPageNo.value)

const activeIndex = computed(() => {
  if (!sectionRanges.value.length)
    return -1

  const clicksVal = $clicks?.value ?? 0
  const raw = clicksVal - props.clickOffset

  if (raw < 0)
    return -1

  return Math.min(raw, sectionRanges.value.length - 1)
})

const highlightRange = computed(() => {
  const section = sectionRanges.value[activeIndex.value]
  if (!section)
    return null

  const start = section.startLine + 1
  const end = section.endLine + 1

  if (Number.isNaN(start) || Number.isNaN(end))
    return null

  return {
    start: Math.max(1, start),
    end: Math.max(start, end),
  }
})

watch(isActive, (active) => {
  if (active) {
    loadFile()
    startRefreshTimer()
  }
  else {
    stopRefreshTimer()
  }
}, { immediate: true })

watch(() => props.file, () => {
  if (isActive.value)
    loadFile(true)
})

watch(
  () => props.sections,
  () => {
    if (rawContent.value)
      recomputeSections(rawContent.value)
  },
  { deep: true },
)

watch([highlightRange, renderedHtml], () => {
  applyHighlight()
}, { flush: 'post' })

const statusMessage = computed(() => {
  if (loadError.value)
    return loadError.value
  if (!rawContent.value)
    return null
  if (!sectionRanges.value.length)
    return 'No sections detected.'
  if (missingSections.value.length)
    return `Missing sections: ${missingSections.value.join(', ')}`
  return null
})

function startRefreshTimer() {
  stopRefreshTimer()
  if (!props.refreshInterval)
    return

  refreshTimer = setInterval(() => {
    if (isActive.value)
      loadFile()
  }, Math.max(1000, props.refreshInterval))
}

function stopRefreshTimer() {
  if (refreshTimer) {
    clearInterval(refreshTimer)
    refreshTimer = null
  }
  if (activeController) {
    activeController.abort()
    activeController = null
  }
}

onBeforeUnmount(() => {
  stopRefreshTimer()
})

onMounted(() => {
  loadFile(true)
})

async function loadFile(force = false) {
  if (!props.file)
    return

  if (isLoading.value) {
    if (force && activeController)
      activeController.abort()
    else
      return
  }

  const url = resolveFileUrl(props.file)
  if (!url) {
    loadError.value = `Cannot resolve file path: ${props.file}`
    return
  }

  try {
    isLoading.value = true
    loadError.value = null
    activeController = new AbortController()
    const bust = import.meta.env.DEV ? `?_=${Date.now()}` : ''
    const response = await fetch(encodeURI(url + bust), { signal: activeController.signal })
    if (!response.ok)
      throw new Error(`Failed to load file (status ${response.status})`)
    const text = await response.text()
    activeController = null
    const cleaned = stripCommentMarkers(text)
    rawContent.value = cleaned
    recomputeSections(cleaned)
    await renderContent(cleaned)
  }
  catch (error) {
    if ((error as DOMException)?.name === 'AbortError')
      return
    loadError.value = error instanceof Error ? error.message : String(error)
  }
  finally {
    isLoading.value = false
  }
}

function recomputeSections(source: string) {
  const { sections, missing } = computeSections(source, props.sections)
  sectionRanges.value = sections
  missingSections.value = missing
}

async function renderContent(source: string) {
  try {
    // Import shiki directly and use the theme object
    // Note: This gives basic markdown highlighting but doesn't tokenize YAML frontmatter
    // as richly as Slidev's code blocks do. Slidev uses @shikijs/markdown-it which
    // properly detects YAML frontmatter (---) and applies YAML grammar to those sections.
    // To achieve the same level of tokenization, we'd need to integrate markdown-it
    // with the Shiki plugin. For now, this provides functional highlighting with
    // correct theme colors and dark background.
    const highlighter = await getSharedHighlighter()
    const themeName = (PenguinTheme as { name?: string }).name ?? 'theme-penguin'
    const frontmatter = detectFrontMatterRange(source)
    const transformers = frontmatter
      ? [createFrontmatterTransformer(frontmatter, themeName)]
      : []

    const html = await highlighter.codeToHtml(source, {
      lang: 'markdown',
      theme: themeName,
      transformers,
    })

    renderedHtml.value = html.replace('<pre class="shiki"', '<pre class="slidev-code shiki"')
  }
  catch (error) {
    console.error('[renderContent] error:', error)
    loadError.value = error instanceof Error ? error.message : String(error)
  }
}

async function applyHighlight() {
  await nextTick()
  const container = codeWrapperRef.value
  if (!container)
    return

  const lines = Array.from(container.querySelectorAll('pre.shiki code > span.line')) as HTMLElement[]
  if (!lines.length)
    return

  const range = highlightRange.value
  if (!range) {
    clearHighlights(lines)
    return
  }

  applyLineRange(lines, range.start, range.end)

  if (props.maxHeight) {
    const startIndex = Math.max(0, Math.min(lines.length - 1, range.start - 1))
    const endIndex = Math.max(startIndex, Math.min(lines.length - 1, range.end - 1))
    const firstLine = lines[startIndex]
    const lastLine = lines[endIndex]
    const scrollTarget = (container.querySelector('.slidev-code') as HTMLElement | null) ?? container

    if (firstLine && scrollTarget) {
      const firstRect = firstLine.getBoundingClientRect()
      const lastRect = (lastLine || firstLine).getBoundingClientRect()
      const baseRect = scrollTarget.getBoundingClientRect()

      const firstTop = firstRect.top - baseRect.top + scrollTarget.scrollTop
      const lastBottom = lastRect.bottom - baseRect.top + scrollTarget.scrollTop
      const sectionHeight = Math.max(lastBottom - firstTop, 0)

      const viewportHeight = scrollTarget.clientHeight
      const offset = Math.max(viewportHeight * 0.05, 24)
      let target = Math.max(firstTop - offset, 0)

      if (sectionHeight > viewportHeight * 0.9)
        target = Math.max(firstTop, 0)

      scrollTarget.scrollTo({ top: target, behavior: 'smooth' })
    }
  }
}

function clearHighlights(lines: HTMLElement[]) {
  for (const line of lines)
    line.classList.remove('slidev-code-highlighted', 'slidev-code-dishonored', 'highlighted', 'dishonored')
}

function applyLineRange(lines: HTMLElement[], start: number, end: number) {
  const startLine = Math.max(1, Math.min(start, end))
  const endLine = Math.max(start, end)

  lines.forEach((line, index) => {
    const lineNo = index + 1
    const isHighlighted = lineNo >= startLine && lineNo <= endLine
    line.classList.toggle('slidev-code-highlighted', isHighlighted)
    line.classList.toggle('highlighted', isHighlighted)
    const isDimmed = !isHighlighted
    line.classList.toggle('slidev-code-dishonored', isDimmed)
    line.classList.toggle('dishonored', isDimmed)
  })
}

function resolveFileUrl(path: string) {
  if (!path)
    return ''

  if (/^https?:\/\//.test(path))
    return path

  if (path.startsWith('/@fs/'))
    return path

  if (path.startsWith('/Users/') || path.startsWith('/Volumes/') || /^[A-Z]:\//i.test(path))
    return `/@fs${path}`

  if (path.startsWith('/'))
    return path

  return `/${path}`
}

type SectionMatch = {
  label: string
  startLine: number
  endLine: number
}

function computeSections(source: string, requested?: string[]): { sections: SectionMatch[]; missing: string[] } {
  const lines = source.split(/\r?\n/)
  const headings: Array<{ text: string; line: number; norm: string }> = []
  const headingPattern = /^(#{1,6})\s+(.*)$/

  lines.forEach((line, index) => {
    const match = headingPattern.exec(line)
    if (match) {
      const text = match[2].trim()
      headings.push({ text, line: index, norm: normalizeHeading(text) })
    }
  })

  const frontMatterEnd = detectFrontMatterEnd(lines)
  const sections: SectionMatch[] = []
  const missing: string[] = []

  if (requested?.length) {
    requested.forEach((entry) => {
      const normalized = normalizeHeading(entry)
      if (normalized === 'frontmatter') {
        if (frontMatterEnd >= 0)
          sections.push({ label: entry, startLine: 0, endLine: frontMatterEnd })
        else
          missing.push(entry)
        return
      }

      const match = headings.find((heading) => heading.norm === normalized)
      if (!match) {
        missing.push(entry)
        return
      }

      sections.push({ label: entry, startLine: match.line, endLine: match.line })
    })
  }
  else {
    if (frontMatterEnd >= 0)
      sections.push({ label: 'Frontmatter', startLine: 0, endLine: frontMatterEnd })

    headings.forEach((heading) => {
      sections.push({ label: heading.text, startLine: heading.line, endLine: heading.line })
    })
  }

  const ordered = [...sections].sort((a, b) => a.startLine - b.startLine)
  ordered.forEach((section, index) => {
    if (section.startLine < 0)
      section.startLine = 0

    if (normalizeHeading(section.label) === 'frontmatter' && frontMatterEnd >= 0) {
      section.endLine = frontMatterEnd
      return
    }

    const next = ordered[index + 1]
    const fallbackEnd = lines.length ? lines.length - 1 : section.startLine
    section.endLine = next ? Math.max(section.startLine, next.startLine - 1) : fallbackEnd
  })

  return {
    sections,
    missing,
  }
}

function detectFrontMatterEnd(lines: string[]) {
  if (!lines.length)
    return -1

  if (lines[0].trim() !== '---')
    return -1

  for (let index = 1; index < lines.length; index++) {
    if (lines[index].trim() === '---')
      return index
  }

  return -1
}

function normalizeHeading(value: string) {
  return value
    .replace(/^#+\s*/, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function stripCommentMarkers(source: string) {
  return source
    .split(/\r?\n/)
    .filter((line) => {
      const trimmed = line.trim()
      if (!trimmed.startsWith('<!--') || !trimmed.endsWith('-->'))
        return true

      return !/^<!--\s*[A-Z0-9:_-]+\s*-->$/i.test(trimmed)
    })
    .join('\n')
}

type FrontmatterRange = { start: number; end: number }

function detectFrontMatterRange(source: string): FrontmatterRange | null {
  const lines = source.split(/\r?\n/)
  const end = detectFrontMatterEnd(lines)
  if (end < 0)
    return null
  return { start: 0, end }
}

let highlighterPromise: Promise<Highlighter> | null = null

async function getSharedHighlighter() {
  if (!highlighterPromise) {
    highlighterPromise = import('shiki').then(async (mod) => {
      const highlighter = await mod.getHighlighter({ langs: ['markdown', 'md', 'yaml'] })
      await highlighter.loadTheme(PenguinTheme as any)
      return highlighter
    })
  }
  return highlighterPromise
}

function createFrontmatterTransformer(range: FrontmatterRange, themeName: string) {
  return {
    name: 'markdown-section-frontmatter-transformer',
    tokens(this: any, tokens: any[][]) {
      const total = range.end - range.start + 1
      if (total <= 0)
        return tokens

      const frontMatterSource = this.source
        .split(/\r?\n/)
        .slice(range.start, range.start + total)
        .join('\n')

      if (!frontMatterSource)
        return tokens

      const yamlTokensResult = this.codeToTokens(frontMatterSource, {
        lang: 'yaml',
        theme: themeName,
      })

      const yamlTokens = yamlTokensResult?.tokens || []
      for (let index = 0; index < yamlTokens.length; index++) {
        const target = range.start + index
        if (tokens[target])
          tokens[target] = yamlTokens[index]
      }

      return tokens
    },
  }
}
</script>

<template>
  <div class="markdown-section-viewer">
    <div
      ref="codeWrapperRef"
      class="markdown-section-viewer__code slidev-code-wrapper slidev-code-line-numbers relative"
      :class="{
        'markdown-section-viewer__code--loading': isLoading,
        'markdown-section-viewer__code--error': statusMessage,
      }"
      :style="{
        maxHeight: props.maxHeight,
        overflowY: props.maxHeight ? 'auto' : undefined,
      }"
    >
      <div v-if="renderedHtml" class="markdown-section-viewer__shiki" v-html="renderedHtml" />
      <div v-else class="markdown-section-viewer__placeholder">
        <span v-if="isLoading">Loading markdown…</span>
        <span v-else-if="statusMessage">{{ statusMessage }}</span>
        <span v-else>Waiting for content…</span>
      </div>
    </div>
    <p v-if="statusMessage" class="markdown-section-viewer__status">
      {{ statusMessage }}
    </p>
  </div>
</template>

<style scoped>
.markdown-section-viewer {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.markdown-section-viewer__code {
  background-color: transparent;
  border-radius: var(--slidev-code-radius);
  padding: 0;
  overflow: hidden;
}

.markdown-section-viewer__code--loading {
  opacity: 0.75;
}

.markdown-section-viewer__code--error {
  border: 1px solid rgba(255, 85, 85, 0.45);
}

.markdown-section-viewer__placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 8rem;
  color: var(--slidev-theme-muted-foreground, rgba(148, 163, 184, 0.85));
  font-size: 0.9rem;
}

.markdown-section-viewer__status {
  font-size: 0.8rem;
  color: rgba(255, 85, 85, 0.75);
}

.markdown-section-viewer__shiki {
  display: block;
}

.markdown-section-viewer__shiki :deep(pre.shiki) {
  margin: 0;
}

.markdown-section-viewer__shiki :deep(.line.highlighted) {
  background-color: rgba(255, 255, 255, 0.06);
}

html:not(.dark) .markdown-section-viewer__shiki :deep(.line.highlighted) {
  background-color: rgba(62, 81, 102, 0.08);
}

.markdown-section-viewer__shiki :deep(.line.dishonored) {
  opacity: 0.55;
}
</style>
