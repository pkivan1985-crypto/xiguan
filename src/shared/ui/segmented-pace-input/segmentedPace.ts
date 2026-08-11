export interface PaceSegments {
	minutes: string;
	seconds: string;
}

function paceDigits(value: string): string {
	return value.replace(/\D/g, '').slice(0, 2);
}

export function parsePaceSegments(value: string): PaceSegments {
	const [minutes = '', seconds = ''] = value.split(':', 2);
	return {
		minutes: paceDigits(minutes),
		seconds: paceDigits(seconds),
	};
}

export function paceValueFromSegments(minutes: string, seconds: string): string {
	const nextMinutes = paceDigits(minutes);
	const nextSeconds = paceDigits(seconds);
	return nextMinutes || nextSeconds ? `${nextMinutes}:${nextSeconds}` : '';
}
