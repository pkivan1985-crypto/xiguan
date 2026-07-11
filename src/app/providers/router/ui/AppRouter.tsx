import { AnimatePresence } from 'framer-motion';
import { useLocation, useNavigationType, useRoutes } from 'react-router';
import { routeConfig } from '../config/routeConfig';
import { DirectionContext, type Direction } from '@shared/lib/router';

/**
 * Main application router with transition animations.
 * Renders routes from routeConfig.
 */
function AppRouter() {
	const location = useLocation();
	const navigationType = useNavigationType();
	const routes = useRoutes(routeConfig, location);

	const direction: Direction = navigationType === 'POP' ? 'backward' : 'forward';

	return (
		/**
		 * Provide navigation direction to children.
		 * Used by ModalLayout to determine transition variant.
		 */
		<DirectionContext value={direction}>
			<AnimatePresence initial={false} mode='wait'>
				<div key={location.pathname}>{routes}</div>
			</AnimatePresence>
		</DirectionContext>
	);
}

export { AppRouter };
