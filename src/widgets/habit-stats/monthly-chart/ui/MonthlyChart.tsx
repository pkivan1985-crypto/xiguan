import type { ChartOptions, ChartData } from 'chart.js';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Filler } from 'chart.js';
import { FaCalendarAlt } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';
import { Line } from 'react-chartjs-2';
import { type CompletedDay, getCompletionCountPerMonth } from '@entities/habit';
import { getMonthLabels } from '@shared/lib/date-time';
import { Card } from '@shared/ui';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler);

interface Props {
	options: ChartOptions<'line'>;
	days: CompletedDay[];
	color: string;
}

function MonthlyChart({ options, days, color }: Props) {
	// Check color format once per chart render
	if (!color.startsWith('oklch')) {
		console.warn(`[Chart]: Color "${color}" is not OKLCH. Gradient transparency will look muddy.`);
	}

	// UI localization
	const { t, i18n } = useTranslation();

	const data = getCompletionCountPerMonth(days);

	const config: {
		data: ChartData<'line'>,
		options: ChartOptions<'line'>,
	} = {
		data: {
			labels: getMonthLabels(i18n.language, { length: 'short' }),
			datasets: [{
				label: t('habits.stats.chartCompletions'),
				data,

				pointBackgroundColor: getComputedStyle(document.documentElement).color ?? 'white',
				pointBorderWidth: 0,

				borderColor: color,
				// borderWidth: 1,
				tension: .4,

				backgroundColor: (context) => {
					if (!context.chart.chartArea) return;

					const { ctx, chartArea: { top, bottom } } = context.chart;
					const bg = ctx.createLinearGradient(0, top, 0, bottom);

					bg.addColorStop(0, color);

					/**
					 * Creates clean gradient from oklch color to transparent.
					 * Appends '/ 0' alpha to prevent muddy gray interpolation.
					 */
					bg.addColorStop(1, color.replace(')', ' / 0)'));

					return bg;
				},

				fill: true
			}]
		},
		options
	};

	return (
		<Card
			title={t('habits.stats.monthlyChartTitle')}
			description={t('habits.stats.monthlyChartDesc')}
			badgeIcon={<FaCalendarAlt />}
			badgeColors={{
				bg: 'var(--darkened-color)',
				color: 'var(--base-color)'
			}}
		>
			<Line {...config} />
		</Card>
	);
}

export { MonthlyChart };