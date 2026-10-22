import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'Firebolt Web API Documentation',
  description: 'API documentation for Firebolt 9 Web JavaScript client',
  head: [
    ['link', { rel: 'icon', href: '/firebolt-logo-small.png' }]
  ],
  themeConfig: {
    nav: [
      { text: 'Home', link: '/' },
      { text: 'API Docs', link: '/api/accessibility' },
      { text: 'References', link: '/references' }
    ],
    sidebar: {
      '/api/': [
        {
          text: 'API Documentation',
          items: [
            { text: 'Accessibility', link: '/api/accessibility' },
            { text: 'Actions', link: '/api/actions' },
            { text: 'Advertising', link: '/api/advertising' },
            { text: 'Device', link: '/api/device' },
            { text: 'Discovery', link: '/api/discovery' },
            { text: 'Display', link: '/api/display' },
            { text: 'Localization', link: '/api/localization' },
            { text: 'Metrics', link: '/api/metrics' },
            { text: 'Network', link: '/api/network' },
            { text: 'VideoOutput', link: '/api/video-output' },
          ]
        }
      ]
    },
    // Enable right sidebar outline (table of contents)
    outline: {
      level: [2, 3],
      label: 'On this page'
    },
    search: {
      provider: 'local'
    },
    // Theme appearance: 'dark' (default dark), 'light' (default light), or 'force-auto' (system preference)
    // Users can toggle via the theme switch button in the navbar
    appearance: 'force-auto',
    // Remove default footer
    footer: {
      message: ''
    }
  }
})
