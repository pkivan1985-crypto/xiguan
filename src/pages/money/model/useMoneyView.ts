import { useEffect, useState } from 'react';
import { useLocation } from 'react-router';
import type { MoneyView } from '@entities/money';
import { loadMoneyInApp } from '@features/money';

export function useMoneyView(month: string) {
	const { key: routeKey } = useLocation();
	const [result, setResult] = useState<{ month: string; routeKey: string; view: MoneyView } | null>(null);
	const [error, setError] = useState(false);
	const [nonce, setNonce] = useState(0);
	useEffect(() => {
		let active = true;
		void loadMoneyInApp(month).then((view) => {
			if (active) { setResult({ month, routeKey, view }); setError(false); }
		}).catch(() => { if (active) setError(true); });
		return () => { active = false; };
	}, [month, nonce, routeKey]);
	return {
		view: result?.month === month && result.routeKey === routeKey ? result.view : null, error,
		reload: () => { setError(false); setNonce((value) => value + 1); },
	};
}
