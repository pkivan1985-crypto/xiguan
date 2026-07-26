import type { ComponentType } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';

import type { DeckView } from '@features/load-card-deck';

import * as deckPageModule from './DeckPage';

const translations: Record<string, string> = {
	'shell.actions.openSettings': '打开设置',
	'shell.deck.active': '正在进行',
	'shell.deck.activeAndArchived': '{{active}} 个进行中 · {{archived}} 个已归档',
	'shell.deck.archive': '已归档',
	'shell.deck.collapse': '收起',
	'shell.deck.daily': '每天',
	'shell.deck.days': '天',
	'shell.deck.details': '查看详情',
	'shell.deck.emptyCards': '这个分类还没有习惯',
	'shell.deck.filters.all': '全部',
	'shell.deck.filters.life': '生活',
	'shell.deck.filters.reading': '阅读',
	'shell.deck.filters.sport': '运动',
	'shell.deck.longTerm': '长期目标',
	'shell.deck.newHabit': '新建习惯',
	'shell.deck.noGoal': '未设置目标',
	'shell.deck.plan': '计划',
	'shell.deck.stage': '阶段目标',
	'shell.deck.trackingTypes.avoid': '避免记录',
	'shell.deck.trackingTypes.check': '完成记录',
	'shell.deck.trackingTypes.count': '次数记录',
	'shell.deck.trackingTypes.duration': '时长记录',
	'shell.deck.trackingTypes.quantity': '数值记录',
	'shell.nav.deck': '习惯',
};

vi.mock('react-i18next', () => ({
	useTranslation: () => ({
		t: (key: string, values: Record<string, string | number> = {}) => {
			const template = translations[key] ?? key;
			return Object.entries(values).reduce(
				(result, [name, value]) => result.replace(`{{${name}}}`, String(value)),
				template,
			);
		},
	}),
}));

const view: DeckView = {
	archivedCount: 1,
	categories: [{
		id: 'sport',
		title: '运动',
		enabled: true,
		cards: [],
	}],
	slots: [null, null, null, null, null, null],
};

type DeckPageContentProps = {
	view: DeckView;
	onCreateHabit: () => void;
	onOpenGoalDetails: (cardId: string) => void;
};

function deckContent(): ComponentType<DeckPageContentProps> | undefined {
	return (
		deckPageModule as unknown as {
			DeckPageContent?: ComponentType<DeckPageContentProps>;
		}
	).DeckPageContent;
}

describe('DeckPage', () => {
	it('places the title, truthful status, settings, and new habit action in the approved header', () => {
		const DeckPageContent = deckContent();
		expect(DeckPageContent).toBeTypeOf('function');
		if (!DeckPageContent) return;

		const html = renderToStaticMarkup(
			<MemoryRouter>
				<DeckPageContent
					onCreateHabit={vi.fn()}
					onOpenGoalDetails={vi.fn()}
					view={view}
				/>
			</MemoryRouter>,
		);

		expect(html).toContain('<h1>习惯</h1>');
		expect(html).toContain('0 个进行中 · 1 个已归档');
		expect(html).toContain('href="/settings"');
		expect(html).toContain('新建习惯');
		expect(html).toContain('data-testid="habit-filter-tabs"');
		expect(html).toContain('data-testid="habit-archive-summary"');
		expect(html).not.toContain('管理卡套');
	});
});
