import {defineConfig} from 'vitepress'
import {resolve} from 'path'

export default defineConfig({
  title: '成就丛林',
  description: '游戏化儿童习惯养成应用 - 用户手册',
  lang: 'zh-CN',
  base: '/doc/',
  outDir: resolve(__dirname, '../../dist/doc'),
  lastUpdated: true,
  ignoreDeadLinks: true,
  themeConfig: {
    logo: '/logo.png',
    siteTitle: '成就丛林',
    nav: [
      {text: '首页', link: '/'},
      {text: '功能介绍', link: '/features'},
      {text: '使用指南', link: '/guide'},
    ],
    sidebar: [
      {
        text: '快速开始',
        items: [
          {text: '首页', link: '/'},
          {text: '功能介绍', link: '/features'},
        ]
      },
      {
        text: '使用指南',
        items: [
          {text: '如何打卡', link: '/guide/checkin'},
          {text: '目标管理', link: '/guide/goals'},
          {text: '勋章系统', link: '/guide/medals'},
          {text: '果实商店', link: '/guide/store'},
          {text: '家长功能', link: '/guide/parent'},
        ]
      }
    ],
    socialLinks: [],
    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2024 成就丛林'
    },
    editLink: {
      pattern: 'https://github.com/your-repo/littletreecheckin/edit/main/docs/:path',
      text: '在 GitHub 上编辑此页面'
    }
  },
  head: [
    ['link', {rel: 'icon', href: '/favicon.ico'}]
  ]
})
