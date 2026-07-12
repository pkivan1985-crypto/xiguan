import { FiActivity, FiPlus, FiX } from 'react-icons/fi';
import { useTranslation } from 'react-i18next';

import type { TodayOutcomeView } from '@features/load-today-outcome';

import styles from './TodayCardPicker.module.css';

interface TodayCardPickerProps {
	open: boolean;
	cards: TodayOutcomeView['availableCards'];
	onSelect: (userCardId: string) => void;
	onClose: () => void;
}

function TodayCardPicker({ open, cards, onSelect, onClose }: TodayCardPickerProps) {
	const { t } = useTranslation();
	if (!open) return null;
	return <div className={styles.backdrop} role='presentation' onMouseDown={onClose}>
		<section className={styles.sheet} role='dialog' aria-modal='true' aria-label={t('shell.today.pickerTitle')} onMouseDown={(event) => event.stopPropagation()}>
			<div className={styles.grabber} />
			<header><div><small className={styles.kicker}>{t('shell.deck.allCards')}</small><h2>{t('shell.today.pickerTitle')}</h2></div><button className={styles.close} type='button' aria-label={t('shell.today.closePicker')} onClick={onClose}><FiX /></button></header>
			<p>{t('shell.today.pickerNote')}</p>
			<div className={styles.list}>{cards.length ? cards.map((card) => <button className={styles.item} key={card.id} type='button' aria-label={`${card.title} ${t('shell.today.selectCard')}`} onClick={() => onSelect(card.id)}>
				<span className={styles.icon}><FiActivity /></span><span><strong>{card.title}</strong><small className={styles.itemMeta}>{card.displayUnit}</small></span><span className={styles.action}><FiPlus />{t('shell.today.selectCard')}</span>
			</button>) : <div className={styles.empty}>{t('shell.today.noAvailableCards')}</div>}</div>
		</section>
	</div>;
}

export { TodayCardPicker };
