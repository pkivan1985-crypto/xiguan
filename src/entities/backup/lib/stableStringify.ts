function normalize(value: unknown, inArray = false): unknown {
	if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
	if (typeof value === 'number') {
		if (!Number.isFinite(value)) throw new Error('UNSUPPORTED_BACKUP_VALUE');
		return value;
	}
	if (typeof value === 'undefined') return inArray ? null : undefined;
	if (Array.isArray(value)) return value.map((item) => normalize(item, true));
	if (typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype) {
		const result: Record<string, unknown> = {};
		for (const key of Object.keys(value).sort()) {
			const normalized = normalize((value as Record<string, unknown>)[key]);
			if (typeof normalized !== 'undefined') result[key] = normalized;
		}
		return result;
	}
	throw new Error('UNSUPPORTED_BACKUP_VALUE');
}

export function stableStringify(value: unknown): string {
	return JSON.stringify(normalize(value));
}
