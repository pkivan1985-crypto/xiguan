import { VitePWA } from 'vite-plugin-pwa';
import svgr from 'vite-plugin-svgr';
import { defineConfig } from 'vitest/config';
import path from 'path';
import react from '@vitejs/plugin-react';
import htmlPlugin from 'vite-plugin-html-config';
import { APP_DESCRIPTION, APP_NAME, APP_SHORT_NAME } from './src/shared/config/app';

const THEME_COLOR_DARK = '#173247';
const THEME_COLOR_LIGHT = '#f3f7f8';
const APP_TITLE = `${APP_NAME}｜让重复行动留下看得见的轨迹`;

export default defineConfig({
	base: '/',

	resolve: {
		alias: {
			'@': path.resolve(__dirname, 'src'),
			'@app': path.resolve(__dirname, 'src/app'),
			'@pages': path.resolve(__dirname, 'src/pages'),
			'@widgets': path.resolve(__dirname, 'src/widgets'),
			'@features': path.resolve(__dirname, 'src/features'),
			'@entities': path.resolve(__dirname, 'src/entities'),
			'@shared': path.resolve(__dirname, 'src/shared'),
		},
	},

	server: {
		open: true,
		host: true,
	},

	build: {
		target: 'es2022',
	},

	plugins: [
		react(),
		svgr(),
		htmlPlugin({
			title: APP_TITLE,
			metas: [
				{ name: 'description', content: APP_DESCRIPTION },
				{ name: 'theme-color', content: THEME_COLOR_DARK },
				{ name: 'theme-color', content: THEME_COLOR_LIGHT, media: '(prefers-color-scheme: light)' },
				{ property: 'og:type', content: 'website' },
				{ property: 'og:site_name', content: APP_NAME },
				{ property: 'og:title', content: APP_TITLE },
				{ property: 'og:description', content: APP_DESCRIPTION },
			],
			headScripts: [
				{
					type: 'application/ld+json',
					content: JSON.stringify({
						'@context': 'https://schema.org',
						'@type': 'WebApplication',
						'name': APP_NAME,
						'description': APP_DESCRIPTION,
						'operatingSystem': 'Android, iOS, Windows, macOS, Linux',
						'applicationCategory': 'LifestyleApplication',
						'isAccessibleForFree': true,
					}),
				},
			],
		}),
		VitePWA({
			registerType: 'prompt',
			injectRegister: false,
			pwaAssets: {
				disabled: false,
				config: true,
			},
			includeManifestIcons: true,
			manifest: {
				name: APP_NAME,
				short_name: APP_SHORT_NAME,
				description: APP_DESCRIPTION,
				prefer_related_applications: false,
				categories: ['health', 'lifestyle', 'productivity'],
				start_url: '.',
				id: '/',
				display: 'standalone',
				display_override: ['standalone', 'minimal-ui', 'browser'],
				orientation: 'portrait',
				lang: 'zh-CN',
				dir: 'ltr',
				theme_color: THEME_COLOR_DARK,
				background_color: THEME_COLOR_LIGHT,
			},
			workbox: {
				globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
				cleanupOutdatedCaches: true,
				clientsClaim: true,
			},
			devOptions: {
				enabled: false,
				navigateFallback: 'index.html',
				suppressWarnings: true,
				type: 'module',
			},
		}),
	],

	test: {
		coverage: {
			include: ['src/shared/**/*.ts'],
			exclude: [
				'**/const/**',
				'**/animations.ts',
				'**/*.animations.ts',
				'**/paths.ts',
				'**/index.ts',
				'**/*.d.ts',
				'**/types.ts',
				'**/*.types.ts',
				'**/config.ts',
				'**/store.ts',
			],
		},
	},
});
