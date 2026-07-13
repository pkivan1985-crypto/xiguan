interface FocusTarget {
	focus: () => void;
}

interface ConfirmationKeyboardEvent {
	key: string;
	shiftKey: boolean;
	preventDefault: () => void;
}

function keepFocusInsideConfirmation(
	event: ConfirmationKeyboardEvent,
	active: FocusTarget | null,
	first: FocusTarget | null,
	last: FocusTarget | null,
) {
	if (event.key !== 'Tab' || !first || !last) return;
	const target = event.shiftKey && active === first ? last : !event.shiftKey && active === last ? first : null;
	if (!target) return;
	event.preventDefault();
	target.focus();
}

export { keepFocusInsideConfirmation };
export type { FocusTarget };
