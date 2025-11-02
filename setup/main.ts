import { AsGraphic } from '@alvarosabu/ui'
import { defineAppSetup } from '@slidev/types'

import MarkdownSectionViewer from '../components/MarkdownSectionViewer.vue'
import SectionTimeline from '../components/SectionTimeline.vue'

export default defineAppSetup(({ app }) => {
  app.component('AsGraphic', AsGraphic)
  app.component('MarkdownSectionViewer', MarkdownSectionViewer)
  app.component('SectionTimeline', SectionTimeline)
})
