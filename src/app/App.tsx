import './styles/App.css';
import { MotionConfig } from 'framer-motion';
import { Toaster } from 'sonner'
import { AppRouter } from './providers';
import PWABadge from '../PWABadge';
import { useSettingsStore, useTheme } from '@entities/settings';
import { useSystemMotion } from '@shared/lib/react';
import { Dialog, Drawer } from '@shared/ui';

function App() {
	const settings = useSettingsStore((s) => s.settings);
	const hasReducedMotion = useSystemMotion();
	const theme = useTheme();
	// MotionConfig enum values are implementation constants, not user-facing copy.
	// eslint-disable-next-line i18next/no-literal-string
	const reducedMotion = !settings.isAnimationsEnabled || hasReducedMotion ? 'always' : 'never';

	return (
		<MotionConfig reducedMotion={reducedMotion}>
			<main className='App'>
				<AppRouter />
				<Dialog />
				<Drawer />

				<Toaster
					position='top-center'
					theme={theme ?? 'system'}
					richColors
					toastOptions={{ className: 'toast' }}
				/>

				<PWABadge />
			</main>
		</MotionConfig>
	);
}

export { App };
