/// <reference types="vitest/config" />
import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // PWA: manifest + service worker (instalação no iPhone pelo Safari → "Adicionar à Tela de Início").
    // Ver docs/decisoes.md (2026-11-25, "App será um PWA").
    VitePWA({
      registerType: 'autoUpdate',
      // Service worker próprio (src/sw.ts) para receber as notificações dos lembretes.
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      includeAssets: ['favicon.png', 'apple-touch-icon.png'],
      manifest: {
        name: 'App de Hábitos',
        short_name: 'Hábitos',
        description: 'Acompanhamento pessoal de hábitos',
        lang: 'pt-BR',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        theme_color: '#0e7490',
        background_color: '#ffffff',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'pwa-maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,png,svg,ico,webmanifest}'],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  server: {
    host: true,
    port: 5174,
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    // Fuso fixo nos testes: as regras de data do app são em Brasília, e o resultado não
    // pode depender da máquina que roda (ver docs/padroes.md → "Datas e fuso horário").
    env: { TZ: 'America/Sao_Paulo' },
    css: false,
  },
})
