import './styles/App.css';
import { MotionConfig } from 'framer-motion';
import { Toaster } from 'sonner'
import { AppRouter } from './providers';
import { PwaUpdateProvider } from '@features/pwa-update/model/PwaUpdateProvider';
import { PwaStatusBar } from '@widgets/pwa-status-bar';
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
			<PwaUpdateProvider>
				<main className='App'>
					<AppRouter />
					<Dialog />
					<Drawer />
					<PwaStatusBar />

					<Toaster
						position='top-center'
						theme={theme ?? 'system'}
						richColors
						toastOptions={{ className: 'toast' }}
					/>
				</main>
			</PwaUpdateProvider>
		</MotionConfig>
	);
}

export { App };
