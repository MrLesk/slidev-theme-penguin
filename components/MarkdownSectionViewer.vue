<script setup lang="ts">
import { useSlideContext } from '@slidev/client'
import type { Highlighter } from 'shiki'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
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
  if (typeof page === 'number') return page
  if (page && typeof (page as { value?: unknown }).value === 'number')
    return (page as { value: number }).value
  return 0
})
const isActive = computed(() => activeSlideNo.value === currentPageNo.value)

const activeIndex = computed(() => {
  if (!sectionRanges.value.length) return -1

  const clicksVal = $clicks?.value ?? 0
  const raw = clicksVal - props.clickOffset

  if (raw < 0) return -1

  return Math.min(raw, sectionRanges.value.length - 1)
})

const highlightRange = computed(() => {
  const section = sectionRanges.value[activeIndex.value]
  if (!section) return null

  const start = section.startLine + 1
  const end = section.endLine + 1

  if (Number.isNaN(start) || Number.isNaN(end)) return null

  return {
    start: Math.max(1, start),
    end: Math.max(start, end),
  }
})

watch(
  isActive,
  (active) => {
    if (active) {
      loadFile()
      startRefreshTimer()
    } else {
      stopRefreshTimer()
    }
  },
  { immediate: true },
)

watch(
  () => props.file,
  () => {
    if (isActive.value) loadFile(true)
  },
)

watch(
  () => props.sections,
  () => {
    if (rawContent.value) recomputeSections(rawContent.value)
  },
  { deep: true },
)

watch(
  [highlightRange, renderedHtml],
  () => {
    applyHighlight()
  },
  { flush: 'post' },
)

// biome-ignore lint/correctness/noUnusedVariables: consumed in the template rendering
const statusMessage = computed(() => {
  if (loadError.value) {
    // If we're polling and the error is about file not found, show a friendly loading message
    if (props.refreshInterval && loadError.value.includes('Unable to resolve path from pattern')) {
      return null // Don't show error, show loading message instead
    }
    return loadError.value
  }
  if (!rawContent.value) return null
  if (!sectionRanges.value.length) return 'No sections detected.'
  if (missingSections.value.length) return `Missing sections: ${missingSections.value.join(', ')}`
  return null
})

const displayMessage = computed(() => {
  if (isLoading.value) return 'Loading task…'
  if (loadError.value && props.refreshInterval && loadError.value.includes('Unable to resolve path from pattern')) {
    return 'Waiting for task to be created…'
  }
  if (statusMessage.value) return statusMessage.value
  if (!rawContent.value) return 'Waiting for content…'
  return null
})

function startRefreshTimer() {
  stopRefreshTimer()
  if (!props.refreshInterval) return

  refreshTimer = setInterval(
    () => {
      if (isActive.value) loadFile()
    },
    Math.max(1000, props.refreshInterval),
  )
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
  if (!props.file) return

  if (isLoading.value) {
    if (force && activeController) activeController.abort()
    else return
  }

  try {
    isLoading.value = true
    loadError.value = null
    activeController = new AbortController()

    const target = await resolveFileTarget(props.file, { force })
    const { text } = await loadResolvedContent(target, activeController.signal, props.file)

    activeController = null
    const cleaned = stripCommentMarkers(text)
    rawContent.value = cleaned
    recomputeSections(cleaned)
    await renderContent(cleaned)
  } catch (error) {
    if ((error as DOMException)?.name === 'AbortError') return
    loadError.value = error instanceof Error ? error.message : String(error)
  } finally {
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
    const transformers = frontmatter ? [createFrontmatterTransformer(frontmatter, themeName)] : []

    const html = await highlighter.codeToHtml(source, {
      lang: 'markdown',
      theme: themeName,
      transformers,
    })

    renderedHtml.value = html.replace('<pre class="shiki"', '<pre class="slidev-code shiki"')
  } catch (error) {
    console.error('[renderContent] error:', error)
    loadError.value = error instanceof Error ? error.message : String(error)
  }
}

async function applyHighlight() {
  await nextTick()
  const container = codeWrapperRef.value
  if (!container) return

  const lines = Array.from(
    container.querySelectorAll('pre.shiki code > span.line'),
  ) as HTMLElement[]
  if (!lines.length) return

  const range = highlightRange.value
  if (!range) {
    clearHighlights(lines)
    return
  }

  applyLineRange(lines, range.start, range.end)

  if (props.maxHeight) {
    // Find the actual highlighted lines for scroll positioning
    const highlightedLines = lines.filter((line) => line.classList.contains('highlighted'))

    if (highlightedLines.length === 0) return

    const firstLine = highlightedLines[0]
    const lastLine = highlightedLines[highlightedLines.length - 1]
    const scrollTarget =
      (container.querySelector('.slidev-code') as HTMLElement | null) ?? container

    if (firstLine && scrollTarget) {
      // Use offsetTop for accurate position regardless of scroll state
      const sectionTop = firstLine.offsetTop
      const sectionBottom = lastLine.offsetTop + lastLine.offsetHeight
      const sectionHeight = sectionBottom - sectionTop

      const viewportHeight = scrollTarget.clientHeight
      const maxScrollTop = scrollTarget.scrollHeight - viewportHeight

      let targetScrollTop: number

      if (sectionHeight <= viewportHeight) {
        // Small section: center it vertically
        const sectionMiddle = sectionTop + sectionHeight / 2
        targetScrollTop = sectionMiddle - viewportHeight / 2
      } else {
        // Large section: scroll to top (show heading first)
        const offset = 20 // Small breathing room from top
        targetScrollTop = sectionTop - offset
      }

      // Clamp to valid scroll range
      targetScrollTop = Math.max(0, Math.min(targetScrollTop, maxScrollTop))

      scrollTarget.scrollTo({ top: targetScrollTop, behavior: 'smooth' })
    }
  }
}

function clearHighlights(lines: HTMLElement[]) {
  for (const line of lines)
    line.classList.remove(
      'slidev-code-highlighted',
      'slidev-code-dishonored',
      'highlighted',
      'dishonored',
    )
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
  if (!path) return ''

  if (/^https?:\/\//.test(path)) return path

  if (path.startsWith('/@fs/')) return path

  if (path.startsWith('/Users/') || path.startsWith('/Volumes/') || /^[A-Z]:\//i.test(path))
    return `/@fs${path}`

  if (path.startsWith('/')) return path

  return `/${path}`
}

type SectionMatch = {
  label: string
  startLine: number
  endLine: number
}

function computeSections(
  source: string,
  requested?: string[],
): { sections: SectionMatch[]; missing: string[] } {
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
        else missing.push(entry)
        return
      }

      const match = headings.find((heading) => heading.norm === normalized)
      if (!match) {
        missing.push(entry)
        return
      }

      sections.push({ label: entry, startLine: match.line, endLine: match.line })
    })
  } else {
    if (frontMatterEnd >= 0)
      sections.push({ label: 'Frontmatter', startLine: 0, endLine: frontMatterEnd })

    headings.forEach((heading) => {
      sections.push({ label: heading.text, startLine: heading.line, endLine: heading.line })
    })
  }

  const ordered = [...sections].sort((a, b) => a.startLine - b.startLine)
  ordered.forEach((section, index) => {
    if (section.startLine < 0) section.startLine = 0

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
  if (!lines.length) return -1

  if (lines[0].trim() !== '---') return -1

  for (let index = 1; index < lines.length; index++) {
    if (lines[index].trim() === '---') return index
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
      if (!trimmed.startsWith('<!--') || !trimmed.endsWith('-->')) return true

      return !/^<!--\s*[A-Z0-9:_-]+\s*-->$/i.test(trimmed)
    })
    .join('\n')
}

type FrontmatterRange = { start: number; end: number }

function detectFrontMatterRange(source: string): FrontmatterRange | null {
  const lines = source.split(/\r?\n/)
  const end = detectFrontMatterEnd(lines)
  if (end < 0) return null
  return { start: 0, end }
}

let highlighterPromise: Promise<Highlighter> | null = null

async function getSharedHighlighter() {
  if (!highlighterPromise) {
    highlighterPromise = import('shiki').then(async (mod) => {
      const highlighter = await mod.getHighlighter({ langs: ['markdown', 'md', 'yaml'] })
      // biome-ignore lint/suspicious/noExplicitAny: Shiki theme loader expects the runtime theme object
      await highlighter.loadTheme(PenguinTheme as any)
      return highlighter
    })
  }
  return highlighterPromise
}

function createFrontmatterTransformer(range: FrontmatterRange, themeName: string) {
  return {
    name: 'markdown-section-frontmatter-transformer',
    // biome-ignore lint/suspicious/noExplicitAny: Shiki transformer API uses loose typings
    tokens(this: any, tokens: any[][]) {
      const total = range.end - range.start + 1
      if (total <= 0) return tokens

      const frontMatterSource = this.source
        .split(/\r?\n/)
        .slice(range.start, range.start + total)
        .join('\n')

      if (!frontMatterSource) return tokens

      const yamlTokensResult = this.codeToTokens(frontMatterSource, {
        lang: 'yaml',
        theme: themeName,
      })

      const yamlTokens = yamlTokensResult?.tokens || []
      for (let index = 0; index < yamlTokens.length; index++) {
        const target = range.start + index
        if (tokens[target]) tokens[target] = yamlTokens[index]
      }

      return tokens
    },
  }
}

async function loadResolvedContent(
  target: ResolvedFileTarget | null,
  signal: AbortSignal,
  originalInput: string,
) {
  if (!target) throw new Error(`Unable to resolve path from pattern: ${originalInput}`)

  const bust = import.meta.env.DEV ? `?_=${Date.now()}` : ''

  if (target.type === 'raw') {
    const text = await target.loader()
    return { text }
  }

  const response = await fetch(encodeURI(target.url + bust), { signal })
  if (!response.ok) throw new Error(`Failed to load file (status ${response.status})`)

  const text = await response.text()
  return { text }
}

type ResolvedFileTarget =
  | { type: 'direct'; url: string; path: string }
  | { type: 'raw'; loader: () => Promise<string>; path: string }

const markdownGlobLoaders: Record<string, () => Promise<string>> = (() => {
  try {
    return import.meta.glob<string>('/**/*.md', {
      query: '?raw',
      import: 'default',
      eager: false,
    })
  } catch {
    return {}
  }
})()

const directoryCache = new Map<string, { entries: string[]; timestamp: number }>()

async function resolveFileTarget(
  input: string,
  options: { force?: boolean } = {},
): Promise<ResolvedFileTarget | null> {
  if (!input) return null

  const normalized = normalizeFsPath(input)
  if (!containsGlobMagic(normalized)) {
    const url = resolveFileUrl(normalized)
    if (!url) return null
    return {
      type: 'direct',
      url,
      path: normalized,
    }
  }

  const match = await resolveGlobMatch(normalized, options)
  if (!match) return null

  if (match.loader) return { type: 'raw', loader: match.loader, path: match.path }

  const url = resolveFileUrl(match.path)
  if (!url) return null

  return { type: 'direct', url, path: match.path }
}

type GlobMatch = { path: string; loader?: () => Promise<string> }

async function resolveGlobMatch(
  pattern: string,
  options: { force?: boolean },
): Promise<GlobMatch | null> {
  const { dir, glob } = splitGlobPattern(pattern)
  const regex = globToRegExp(glob)

  const loaderMatch = matchGlobFromIndex(dir, regex, pattern)
  if (loaderMatch) return loaderMatch

  const entries = await listDirectoryEntries(dir, options.force)
  if (!entries.length) return null

  const matches = entries.filter((entry) => regex.test(entry))
  if (!matches.length) return null

  if (matches.length > 1)
    throw new Error(`Pattern "${pattern}" matched multiple files: ${matches.join(', ')}`)

  const fileName = matches[0]
  return {
    path: joinFsPath(dir, fileName),
  }
}

function matchGlobFromIndex(dir: string, regex: RegExp, originalPattern: string): GlobMatch | null {
  const entries = Object.entries(markdownGlobLoaders)
  if (!entries.length) return null

  const normalizedDir = normalizeFsPath(dir)
  const dirNeedle = normalizedDir === '/' ? '/' : normalizedDir.replace(/\/+$/, '')
  const dirNeedleWithSlash =
    dirNeedle && dirNeedle !== '.' && dirNeedle !== '/' ? `${dirNeedle}/` : ''

  const candidates = entries.filter(([key]) => {
    const normalizedKey = normalizeFsPath(stripQueryAndHash(key))
    const basename = normalizedKey.split('/').pop() ?? normalizedKey
    if (!regex.test(basename)) return false
    if (!dirNeedleWithSlash) return true
    return normalizedKey.includes(dirNeedleWithSlash)
  })

  if (!candidates.length) return null

  if (candidates.length > 1) {
    const names = candidates.map(([key]) => key.split('/').pop() ?? key)
    throw new Error(`Pattern "${originalPattern}" matched multiple files: ${names.join(', ')}`)
  }

  const [path, loader] = candidates[0]
  return {
    path: normalizeFsPath(path),
    loader,
  }
}

async function listDirectoryEntries(dir: string, force = false): Promise<string[]> {
  const normalizedDir = normalizeFsPath(dir)
  const cacheKey = normalizedDir

  if (!normalizedDir || normalizedDir === '.') return []

  if (!force) {
    const cached = directoryCache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < 4000) return cached.entries
  }

  const urlBase = normalizedDir === '.' ? '/' : resolveFileUrl(normalizedDir)
  if (!urlBase) return []

  const url = `${urlBase}${urlBase.endsWith('/') ? '' : '/'}`
  const bust = import.meta.env.DEV ? `?_=${Date.now()}` : ''

  const response = await fetch(encodeURI(url + bust), {
    headers: {
      accept: 'text/plain, */*;q=0.1',
      'x-markdown-section-viewer': 'dir-list',
    },
  })
  if (!response.ok) return []

  const html = await response.text()
  const entries = parseDirectoryListing(html)
  directoryCache.set(cacheKey, { entries, timestamp: Date.now() })
  return entries
}

function parseDirectoryListing(html: string): string[] {
  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(html, 'text/html')
    const anchors = Array.from(doc.querySelectorAll('a'))
    const results = new Set<string>()

    for (const anchor of anchors) {
      const href = anchor.getAttribute('href') ?? ''
      const decoded = decodeURIComponent(href)
      const name = decoded.split('/').filter(Boolean).pop()
      if (!name || name === '..' || name.endsWith('/')) continue
      results.add(name)
    }

    return Array.from(results)
  } catch {
    const matches = Array.from(html.matchAll(/href="([^"]+)"/g))
    const results = new Set<string>()
    for (const match of matches) {
      const decoded = decodeURIComponent(match[1])
      const name = decoded.split('/').filter(Boolean).pop()
      if (!name || name === '..' || name.endsWith('/')) continue
      results.add(name)
    }
    return Array.from(results)
  }
}

function containsGlobMagic(value: string) {
  return /[*?[{\]]/.test(value)
}

function splitGlobPattern(pattern: string) {
  const normalized = normalizeFsPath(pattern)
  const index = normalized.lastIndexOf('/')
  if (index < 0) return { dir: '.', glob: normalized }
  const dir = normalized.slice(0, index) || '/'
  const glob = normalized.slice(index + 1) || '*'
  return { dir, glob }
}

function globToRegExp(glob: string) {
  let pattern = ''
  let index = 0
  while (index < glob.length) {
    const char = glob[index]
    if (char === '*') {
      const next = glob[index + 1]
      if (next === '*') {
        pattern += '.*'
        index += 2
        continue
      }
      pattern += '[^/]*'
      index += 1
      continue
    }
    if (char === '?') {
      pattern += '.'
      index += 1
      continue
    }
    pattern += escapeRegexChar(char)
    index += 1
  }
  return new RegExp(`^${pattern}$`)
}

function escapeRegexChar(char: string) {
  return /[.+^${}()|[\]\\]/.test(char) ? `\\${char}` : char
}

function joinFsPath(dir: string, name: string) {
  if (!dir || dir === '.') return name
  return `${dir.replace(/\/+$/, '')}/${name.replace(/^\/+/, '')}`
}

function normalizeFsPath(path: string) {
  return path.replace(/\\/g, '/')
}

function stripQueryAndHash(value: string) {
  return value.replace(/[?#].*$/, '')
}
</script>

<template>
  <div class="markdown-section-viewer">
    <div
      ref="codeWrapperRef"
      class="markdown-section-viewer__code slidev-code-wrapper slidev-code-line-numbers relative"
      :class="{
        'markdown-section-viewer__code--loading': isLoading || displayMessage,
        'markdown-section-viewer__code--error': statusMessage && !displayMessage?.includes('Waiting'),
      }"
      :style="{
        maxHeight: props.maxHeight,
        overflowY: props.maxHeight ? 'auto' : undefined,
      }"
    >
      <div v-if="renderedHtml" class="markdown-section-viewer__shiki" v-html="renderedHtml" />
      <div v-else class="markdown-section-viewer__placeholder">
        <span>{{ displayMessage }}</span>
      </div>
    </div>
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
  white-space: pre-wrap;
  word-break: break-word;
}

.markdown-section-viewer__shiki :deep(pre.shiki code) {
  white-space: pre-wrap;
  word-break: break-word;
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
