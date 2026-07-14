function toggleExpandedItemId(current: ReadonlySet<string>, itemId: string): Set<string> {
	const next = new Set(current);
	if (next.has(itemId)) next.delete(itemId);
	else next.add(itemId);
	return next;
}

export { toggleExpandedItemId };
