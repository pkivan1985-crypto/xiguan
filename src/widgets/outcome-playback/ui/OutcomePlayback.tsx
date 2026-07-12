import { motion } from 'framer-motion';
import { FiActivity, FiCheck, FiChevronRight, FiSkipForward } from 'react-icons/fi';
import { useTranslation } from 'react-i18next';

import { formatOutcomeItem } from '@entities/outcome-batch';
import type { OutcomeBatch } from '@entities/outcome-batch';

import styles from './OutcomePlayback.module.css';

interface OutcomePlaybackProps {
	batch: OutcomeBatch;
	reducedMotion: boolean;
	onNext: () => void;
	onSummary: () => void;
}

function OutcomePlayback({ batch, reducedMotion, onNext, onSummary }: OutcomePlaybackProps) {
	const { t } = useTranslation();
	const index = Math.min(Math.max(batch.playbackIndex ?? 0, 0), Math.max(batch.items.length - 1, 0));
	const item = batch.items[index];
	if (!item) return null;
	const isLast = index === batch.items.length - 1;
	const Scene = reducedMotion ? 'section' : motion.section;

	return <main className={styles.playback}>
		<div className={styles.progress}><span>{t('shell.today.playbackProgress', { current: index + 1, total: batch.items.length })}</span><div><i style={{ width: `${((index + 1) / batch.items.length) * 100}%` }} /></div></div>
		<Scene className={styles.scene} {...(!reducedMotion ? { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.28 } } : {})}>
			<span className={styles.resultIcon}><FiActivity aria-hidden='true' /></span>
			<p>{t('shell.today.resultRecorded')}</p><h2>{item.cardTitle}</h2>
			<strong>{formatOutcomeItem(item)} <small>{item.displayUnit}</small></strong>
			{item.longTermChange && <div className={styles.goal}><span>{t('shell.today.longTermChange')}</span><b>{t('shell.today.goalChange', { before: formatOutcomeItem({ ...item, quantityBaseValue: item.longTermChange.before.quantityBaseValue }), after: formatOutcomeItem({ ...item, quantityBaseValue: item.longTermChange.after.quantityBaseValue }) })}</b></div>}
		</Scene>
		<p className={styles.saved}><FiCheck aria-hidden='true' />{reducedMotion ? t('shell.today.staticFallback') : t('shell.today.playbackSaved')}</p>
		<div className={styles.actions}><button className={styles.secondary} type='button' onClick={onSummary}><FiSkipForward />{t('shell.today.skipToSummary')}</button><button className={styles.primary} type='button' onClick={isLast ? onSummary : onNext}>{isLast ? t('shell.today.viewSummary') : t('shell.today.playNext')}<FiChevronRight /></button></div>
	</main>;
}

export { OutcomePlayback };
