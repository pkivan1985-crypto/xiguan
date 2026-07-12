import { FiActivity, FiArrowDown, FiArrowUp, FiCheck, FiChevronRight, FiInfo, FiMoon, FiPlay, FiPlus, FiTrash2 } from 'react-icons/fi';
import { useTranslation } from 'react-i18next';

import type { TodayOutcomeView } from '@features/load-today-outcome';

import styles from './TodayOutcomeEditor.module.css';

interface TodayOutcomeEditorProps {
	view: TodayOutcomeView;
	disabled: boolean;
	onValueChange: (slotIndex: number, valueText: string) => void;
	onMove: (slotIndex: number, direction: -1 | 1) => void;
	onRemove: (slotIndex: number) => void;
	onOpenPicker: () => void;
	onSubmit: () => void;
}

function isValidValue(valueText: string, maxDecimalPlaces: number): boolean {
	const pattern = new RegExp(`^(?:0|[1-9]\\d*)(?:\\.\\d{1,${maxDecimalPlaces}})?$`);
	return pattern.test(valueText) && Number(valueText) > 0;
}

function TodayOutcomeEditor({ view, disabled, onValueChange, onMove, onRemove, onOpenPicker, onSubmit }: TodayOutcomeEditorProps) {
	const { t } = useTranslation();
	const valid = view.selectedCards.length > 0 && view.selectedCards.every(({ valueText, maxDecimalPlaces }) => isValidValue(valueText, maxDecimalPlaces));

	return <div className={styles.editor}>
		<section className={styles.preview} aria-label={t('shell.today.playbackPreview')}>
			<span className={styles.previewIcon}><FiPlay aria-hidden='true' /></span>
			<div><strong>{t('shell.today.playbackPreview')}</strong><p>{t('shell.today.playbackPreviewDescription')}</p></div>
			<span className={styles.count}>{t('shell.today.slotCount', { count: view.selectedCards.length })}</span>
		</section>

		<div className={styles.heading}>
			<div><small>{view.localDate}</small><h2>{t('shell.today.editorTitle')}</h2></div>
			<span><FiInfo aria-hidden='true' />{t('shell.today.cumulativeHint')}</span>
		</div>

		<div className={styles.track}>
			{view.selectedCards.map((card, index) => {
				const Icon = index % 2 === 0 ? FiActivity : FiMoon;
				return <article className={styles.row} key={card.id}>
					<div className={styles.rail} aria-hidden='true'><b>{index + 1}</b>{index < view.selectedCards.length - 1 && <i />}</div>
					<div className={styles.card}>
						<div className={styles.cardHeading}>
							<span className={styles.cardIcon}><Icon aria-hidden='true' /></span>
							<div><h3>{card.title}</h3><p>{card.displayUnit}</p></div>
							<div className={styles.tools}>
								<button type='button' disabled={disabled || index === 0} aria-label={t('shell.today.moveUp', { title: card.title })} onClick={() => onMove(card.slotIndex, -1)}><FiArrowUp /></button>
								<button type='button' disabled={disabled || index === view.selectedCards.length - 1} aria-label={t('shell.today.moveDown', { title: card.title })} onClick={() => onMove(card.slotIndex, 1)}><FiArrowDown /></button>
								<button type='button' disabled={disabled} aria-label={t('shell.today.removeCard', { title: card.title })} onClick={() => onRemove(card.slotIndex)}><FiTrash2 /></button>
							</div>
						</div>
						<label className={styles.valueField}>
							<span className={styles.valueCaption}>{t('shell.today.valueCaption')}</span>
							<span className={styles.inputWrap}>
								<input aria-label={t('shell.today.valueLabel', { title: card.title, unit: card.displayUnit })} inputMode='decimal' disabled={disabled} value={card.valueText} onChange={(event) => onValueChange(card.slotIndex, event.target.value)} />
								<b>{card.displayUnit}</b>
							</span>
						</label>
					</div>
				</article>;
			})}
		</div>

		{view.selectedCards.length < 6 && <button className={styles.addCard} type='button' disabled={disabled} onClick={onOpenPicker}>
			<FiPlus aria-hidden='true' /><span><strong>{t('shell.today.addCard')}</strong><small>{t('shell.today.addCardHint')}</small></span><FiChevronRight aria-hidden='true' />
		</button>}

		<footer className={styles.footer}>
			<div><span className={styles.footerLabel}>{t('shell.today.cardCount', { count: view.footer.cardCount })}</span><strong className={styles.footerValue}>{view.footer.kind === 'total' ? t('shell.today.total', { value: view.footer.valueText, unit: view.footer.displayUnit }) : t('shell.today.filledCount', { filled: view.footer.filledCount, count: view.footer.cardCount })}</strong></div>
			<button className={styles.submit} type='button' disabled={disabled || !valid} onClick={onSubmit}><FiCheck aria-hidden='true' />{t('shell.today.save')}</button>
		</footer>
	</div>;
}

export { TodayOutcomeEditor };
