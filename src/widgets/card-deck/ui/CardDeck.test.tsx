import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import type { CardTemplate } from '@entities/card-template';
import type { DeckCategoryView } from '@features/load-card-deck';

import {
	filterDeckCards,
	resolveDefaultExpandedItemId,
	toggleExpandedItemId,
} from '../model/toggleExpandedItemId';
import { CardDeck, type CardDeckCopy } from './CardDeck';

const runningTemplate: CardTemplate = {
	id: 'running',
	categoryId: 'sport',
	title: '跑步',
	sortOrder: 0,
	enabled: true,
	version: 1,
	defaultStageMode: 'quantity',
	trackingType: 'quantity',
	iconKey: 'activity',
	accent: 'green',
	defaultDailyTargetBase: 5000,
	stepBase: 500,
	quantity: {
		baseUnit: 'meter',
		displayUnit: 'km',
		basePerDisplayUnit: 1000,
		maxDecimalPlaces: 2,
		confirmationThresholdDisplay: 100,
	},
};

const readingTemplate: CardTemplate = {
	...runningTemplate,
	id: 'reading-time',
	categoryId: 'reading',
	title: '阅读',
	trackingType: 'duration',
	iconKey: 'book',
	accent: 'amber',
	defaultDailyTargetBase: 30,
	quantity: {
		baseUnit: 'minute',
		displayUnit: '分钟',
		basePerDisplayUnit: 1,
		maxDecimalPlaces: 0,
		confirmationThresholdDisplay: 720,
	},
};

const waterTemplate: CardTemplate = {
	...runningTemplate,
	id: 'water',
	categoryId: 'life',
	title: '喝水',
	trackingType: 'count',
	iconKey: 'droplet',
	accent: 'cyan',
	defaultDailyTargetBase: 8,
	quantity: {
		baseUnit: 'cup',
		displayUnit: '杯',
		basePerDisplayUnit: 1,
		maxDecimalPlaces: 0,
		confirmationThresholdDisplay: 30,
	},
};

const categories: DeckCategoryView[] = [
	{
		id: 'sport',
		title: '运动',
		enabled: true,
		cards: [{
			id: 'run',
			title: '跑步',
			template: runningTemplate,
			longTermGoal: {
				id: 'run-long',
				userCardId: 'run',
				title: '累计 100 km',
				targetQuantityBase: 100_000,
				status: 'active',
				startDate: '2026-07-01',
				createdAt: '2026-07-01T00:00:00.000Z',
				updatedAt: '2026-07-01T00:00:00.000Z',
			},
			stageGoal: {
				id: 'run-stage',
				longTermGoalId: 'run-long',
				title: '7 月完成 30 km',
				mode: 'quantity',
				targetQuantityBase: 30_000,
				status: 'active',
				startDate: '2026-07-01',
				createdAt: '2026-07-01T00:00:00.000Z',
				updatedAt: '2026-07-01T00:00:00.000Z',
			},
			longTermProgress: {
				quantityBaseValue: 18_400,
				activeDays: 7,
				quantityRatio: 0.184,
				ratio: 0.184,
				completed: false,
			},
			stageProgress: {
				quantityBaseValue: 18_400,
				activeDays: 7,
				quantityRatio: 18.4 / 30,
				ratio: 18.4 / 30,
				completed: false,
			},
		}],
	},
	{
		id: 'reading',
		title: '阅读',
		enabled: true,
		cards: [{
			id: 'read',
			title: '阅读',
			template: readingTemplate,
			longTermGoal: {
				id: 'read-long',
				userCardId: 'read',
				title: '累计阅读 600 分钟',
				targetQuantityBase: 600,
				status: 'active',
				startDate: '2026-07-01',
				createdAt: '2026-07-01T00:00:00.000Z',
				updatedAt: '2026-07-01T00:00:00.000Z',
			},
			longTermProgress: {
				quantityBaseValue: 402,
				activeDays: 8,
				quantityRatio: 0.67,
				ratio: 0.67,
				completed: false,
			},
		}],
	},
	{
		id: 'life',
		title: '生活',
		enabled: true,
		cards: [{
			id: 'water',
			title: '喝水',
			template: waterTemplate,
		}],
	},
];

const copy: CardDeckCopy = {
	active: '正在进行',
	archive: '已归档',
	collapse: '收起',
	daily: '每天',
	days: '天',
	details: '查看详情',
	empty: '这个分类还没有习惯',
	filters: {
		all: '全部',
		sport: '运动',
		reading: '阅读',
		life: '生活',
	},
	longTerm: '长期目标',
	noGoal: '未设置目标',
	plan: '计划',
	stage: '阶段目标',
	trackingTypes: {
		check: '完成记录',
		count: '次数记录',
		quantity: '数值记录',
		duration: '时长记录',
		avoid: '避免记录',
	},
};

describe('card deck state', () => {
	it('filters only the visible cards without mutating their source order', () => {
		expect(filterDeckCards(categories, 'reading').map(({ card }) => card.id)).toEqual(['read']);
		expect(filterDeckCards(categories, 'life').map(({ card }) => card.id)).toEqual(['water']);
		expect(filterDeckCards(categories, 'all').map(({ card }) => card.id)).toEqual([
			'run',
			'read',
			'water',
		]);
		expect(categories[0]?.cards[0]?.id).toBe('run');
	});

	it('expands the first card with a real goal and keeps at most one card open', () => {
		const cards = filterDeckCards(categories, 'all');

		expect(resolveDefaultExpandedItemId(cards)).toBe('run');
		expect(toggleExpandedItemId('run', 'read')).toBe('read');
		expect(toggleExpandedItemId('read', 'read')).toBeNull();
		expect(resolveDefaultExpandedItemId(filterDeckCards(categories, 'life'))).toBeNull();
	});
});

describe('CardDeck', () => {
	it('renders the approved filters, one expanded goal card, compact cards, and truthful archive count', () => {
		const html = renderToStaticMarkup(
			<CardDeck
				archivedCount={2}
				categories={categories}
				copy={copy}
				onOpenGoalDetails={vi.fn()}
			/>,
		);

		expect(html).toContain('role="tablist"');
		expect(html).toContain('aria-selected="true">全部</button>');
		expect(html).toContain('>运动</button>');
		expect(html).toContain('>阅读</button>');
		expect(html).toContain('>生活</button>');
		expect(html).toContain('<h2');
		expect(html).toContain('正在进行</h2>');
		expect(html).toContain('data-layout="expanded"');
		expect(html).toContain('data-layout="compact"');
		expect(html).toContain('累计 100 km');
		expect(html).toContain('7 月完成 30 km');
		expect(html).toContain('18.4 / 100 km');
		expect(html).toContain('18.4 / 30 km');
		expect(html).toContain('计划');
		expect(html).toContain('查看详情');
		expect(html).toContain('收起');
		expect(html).toContain('已归档');
		expect(html).toContain('>2</strong>');
	});

	it('shows daily references and never invents zero progress for a goal-free card', () => {
		const html = renderToStaticMarkup(
			<CardDeck
				archivedCount={0}
				categories={categories}
				copy={copy}
				onOpenGoalDetails={vi.fn()}
			/>,
		);

		expect(html).toContain('每天 5 km');
		expect(html).toContain('每天 30 分钟');
		expect(html).toContain('每天 8 杯');
		expect(html).toContain('未设置目标');
		expect(html).not.toContain('data-card-id="water" data-progress="0%"');
	});
});
