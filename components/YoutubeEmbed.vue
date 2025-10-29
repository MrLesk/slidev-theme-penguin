<template>
  <div class="youtube-embed" :style="{ width, maxWidth }">
    <div v-if="isLoading" class="youtube-embed__loading">
      <div class="youtube-loading-spinner" />
      <p>Loading video...</p>
    </div>
    <iframe
      v-if="embedSrc"
      :src="embedSrc"
      :title="title"
      loading="lazy"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
      allowfullscreen
      @load="isLoading = false"
    />
    <div v-else class="youtube-embed__error">
      <span class="i-la-exclamation-triangle text-4xl mb-2" />
      <p>Unable to load video. Please check the URL.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

defineOptions({ name: 'YoutubeEmbed' })

const props = withDefaults(
  defineProps<{
    url: string
    title?: string
    controls?: boolean
    fullscreen?: boolean
    keyboard?: boolean
    autoplay?: boolean
    modestBranding?: boolean
    width?: string
    maxWidth?: string
    aspectRatio?: string
  }>(),
  {
    title: 'YouTube video player',
    controls: true,
    fullscreen: true,
    keyboard: true,
    autoplay: false,
    modestBranding: true,
    width: '100%',
    maxWidth: '780px',
    aspectRatio: '16/9',
  },
)

const isLoading = ref(true)
const embedSrc = computed(() => buildEmbedUrl(props.url))

function buildEmbedUrl(rawUrl: string): string | null {
  if (!rawUrl) return null

  const trimmed = rawUrl.trim()
  const normalized = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`

  let parsed: URL
  try {
    parsed = new URL(normalized)
  } catch {
    return null
  }

  const host = parsed.hostname.replace(/^www\./, '')
  const pathSegments = parsed.pathname.split('/').filter(Boolean)
  const searchParams = parsed.searchParams

  const startParam =
    searchParams.get('start') || searchParams.get('t') || parsed.hash.replace('#t=', '')
  const startSeconds = parseStartTime(startParam)
  const playlist = searchParams.get('list')
  const loop = searchParams.get('loop')

  const videoId = extractVideoId({ host, pathSegments, searchParams })
  if (!videoId) return null

  const embedUrl = new URL(`https://www.youtube-nocookie.com/embed/${videoId}`)

  // Configure player controls based on props
  embedUrl.searchParams.set('autoplay', props.autoplay ? '1' : '0')
  embedUrl.searchParams.set('controls', props.controls ? '1' : '0')
  embedUrl.searchParams.set('fs', props.fullscreen ? '1' : '0')
  embedUrl.searchParams.set('disablekb', props.keyboard ? '0' : '1')
  embedUrl.searchParams.set('modestbranding', props.modestBranding ? '1' : '0')

  // Standard params for better integration
  embedUrl.searchParams.set('rel', '0')
  embedUrl.searchParams.set('playsinline', '1')
  embedUrl.searchParams.set('iv_load_policy', '3')

  if (startSeconds > 0) {
    embedUrl.searchParams.set('start', String(startSeconds))
  }

  if (playlist) {
    embedUrl.searchParams.set('list', playlist)
  }

  if (loop === '1') {
    embedUrl.searchParams.set('loop', '1')
    embedUrl.searchParams.set('playlist', videoId)
  }

  return embedUrl.toString()
}

function extractVideoId({
  host,
  pathSegments,
  searchParams,
}: {
  host: string
  pathSegments: string[]
  searchParams: URLSearchParams
}): string | null {
  if (!host) return null

  if (host === 'youtu.be' && pathSegments.length > 0) {
    return sanitizeId(pathSegments[0])
  }

  if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'music.youtube.com') {
    if (pathSegments[0] === 'watch') {
      return sanitizeId(searchParams.get('v'))
    }

    if (pathSegments[0] === 'embed' && pathSegments[1]) {
      return sanitizeId(pathSegments[1])
    }

    if (pathSegments[0] === 'shorts' && pathSegments[1]) {
      return sanitizeId(pathSegments[1])
    }
  }

  if (host === 'youtube-nocookie.com' && pathSegments[0] === 'embed' && pathSegments[1]) {
    return sanitizeId(pathSegments[1])
  }

  return sanitizeId(searchParams.get('v'))
}

function sanitizeId(value: string | null): string | null {
  if (!value) return null
  return value.replace(/[^\w-]/g, '') || null
}

function parseStartTime(value: string | null): number {
  if (!value) return 0

  const trimmed = value.toString().replace(/^#?t=/, '').trim()
  if (!trimmed) return 0

  if (/^\d+$/.test(trimmed)) {
    return Number(trimmed)
  }

  const regex = /(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?/i
  const match = trimmed.match(regex)

  if (!match) return 0

  const hours = Number(match[1] || 0)
  const minutes = Number(match[2] || 0)
  const seconds = Number(match[3] || 0)

  const total = hours * 3600 + minutes * 60 + seconds
  return Number.isFinite(total) ? total : 0
}
</script>

<style scoped>
.youtube-embed {
  position: relative;
  margin: 1.25rem auto 0;
  aspect-ratio: v-bind(aspectRatio);
  border-radius: 0.75rem;
  overflow: hidden;
  background: #000;
  box-shadow: 0 12px 30px -16px rgba(0, 0, 0, 0.75);
}

.youtube-embed iframe {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  border: 0;
}

.youtube-embed__loading {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding: 1rem;
  color: rgba(255, 255, 255, 0.8);
  background: rgba(17, 17, 17, 0.9);
}

.youtube-loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid rgba(255, 255, 255, 0.2);
  border-top-color: rgba(255, 255, 255, 0.8);
  border-radius: 50%;
  animation: youtube-spin 0.8s linear infinite;
}

@keyframes youtube-spin {
  to {
    transform: rotate(360deg);
  }
}

.youtube-embed__error {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 1rem;
  color: rgba(255, 255, 255, 0.8);
  background: rgba(17, 17, 17, 0.9);
}

@media (max-width: 820px) {
  .youtube-embed {
    width: 100%;
  }
}

@media (prefers-reduced-motion: reduce) {
  .youtube-loading-spinner {
    animation: none;
  }
}
</style>
