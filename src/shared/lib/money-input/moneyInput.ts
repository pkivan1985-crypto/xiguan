const MONEY_INPUT_PATTERN = /^\d*(?:\.\d{0,2})?$/;

export function normalizeMoneyInput(value: string): string | undefined {
	let normalized = value.trim().replace(/[，,]/g, '.');
	if (!normalized) return '';
	if (normalized.startsWith('.')) normalized = `0${normalized}`;
	return MONEY_INPUT_PATTERN.test(normalized) ? normalized : undefined;
}

export function parseMoneyInputToCents(value: string): number | undefined {
	const normalized = normalizeMoneyInput(value);
	if (normalized === undefined || normalized === '') return undefined;
	const match = /^(\d+)(?:\.(\d{0,2}))?$/.exec(normalized);
	if (!match) return undefined;
	const cents = Number(match[1]) * 100 + Number((match[2] ?? '').padEnd(2, '0'));
	return Number.isSafeInteger(cents) ? cents : undefined;
}

export function moneyInputFromCents(cents: number): string {
	return (cents / 100).toFixed(2);
}

export function formatMoneyInput(value: string): string {
	const cents = parseMoneyInputToCents(value);
	return cents === undefined ? value : moneyInputFromCents(cents);
}

export function prepareMoneyInputForEditing(value: string): string {
	const normalized = normalizeMoneyInput(value);
	if (normalized === undefined || !normalized.includes('.')) return value;
	return normalized.replace(/\.?0+$/, '');
}
