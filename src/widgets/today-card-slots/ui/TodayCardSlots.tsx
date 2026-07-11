/* eslint-disable i18next/no-literal-string -- Slot numbering and count separators are structural UI identifiers. */
import styles from './TodayCardSlots.module.css';
import { FiActivity, FiPlus } from 'react-icons/fi';
import type { DeckSlotView } from '@features/load-card-deck';

interface TodayCardSlotsProps {
	slots: Array<DeckSlotView | null>;
	emptyLabel: string;
	sectionLabel: string;
}

function TodayCardSlots({ slots, emptyLabel, sectionLabel }: TodayCardSlotsProps) {
	return (
		<section aria-label={sectionLabel}>
			<div className={styles.heading}>
				<span>{sectionLabel}</span>
				<small>{slots.filter(Boolean).length} / 6</small>
			</div>
			<div className={styles.grid}>
				{Array.from({ length: 6 }, (_, slotIndex) => {
					const slot = slots[slotIndex] ?? null;
					const label = slot?.title ?? emptyLabel;
					return (
						<div
							key={slotIndex}
							data-slot={slotIndex}
							className={`${styles.slot} ${slot ? styles.filled : ''}`}
							aria-label={`今日位置 ${slotIndex + 1}：${label}`}
						>
							{slot ? <FiActivity aria-hidden='true' /> : <FiPlus aria-hidden='true' />}
							<span>{label}</span>
						</div>
					);
				})}
			</div>
		</section>
	);
}

export { TodayCardSlots };
