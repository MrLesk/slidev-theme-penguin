<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps({
  href: {
    type: String,
  },
  favicon: {
    type: String,
  },
})
function getDomain(url) {
  return url.match(/:\/\/(.[^/]+)/)[1]
}

const faviconUrl = computed(() =>
  props.favicon
    ? props.favicon
    : `https://www.google.com/s2/favicons?domain=${getDomain(props.href)}&sz=32`,
)
const styles = computed(() => ({
  background: `url(${faviconUrl.value}) left center / 16px 16px no-repeat`,
  paddingLeft: '20px',
}))
</script>

<template>
  <a
    :href="href"
    class="fancy-link mx-2 text-sm"
    :style="styles"
  ><slot></slot></a>
</template>

<style scoped>
.fancy-link {
  border-color: transparent;
}
</style>
