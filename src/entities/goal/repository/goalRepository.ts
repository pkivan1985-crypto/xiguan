/* eslint-disable i18next/no-literal-string -- Goal statuses and IndexedDB index names are domain identifiers. */
import type { Table } from 'dexie';
import type { RepeatOutcomeDatabase } from '@shared/lib/db';

import type { LongTermGoal, StageGoal } from '../model/types';

export class GoalRepository {
	private readonly database: RepeatOutcomeDatabase;
	private readonly longTermGoals: Table<LongTermGoal, string>;
	private readonly stageGoals: Table<StageGoal, string>;

	constructor(database: RepeatOutcomeDatabase) {
		this.database = database;
		this.longTermGoals = database.tableFor<LongTermGoal>('longTermGoals');
		this.stageGoals = database.tableFor<StageGoal>('stageGoals');
	}

	addLongTermGoal(goal: LongTermGoal): Promise<string> {
		return this.database.transaction('rw', this.longTermGoals, async () => {
			if (goal.status === 'active') {
				const activeCount = await this.longTermGoals.where('[userCardId+status]').equals([goal.userCardId, 'active']).count();
				if (activeCount > 0) throw new Error('ACTIVE_LONG_TERM_GOAL_EXISTS');
			}
			return this.longTermGoals.add(goal);
		});
	}

	addStageGoal(goal: StageGoal): Promise<string> {
		return this.database.transaction('rw', this.stageGoals, async () => {
			if (goal.status === 'active') {
				const activeCount = await this.stageGoals.where('[longTermGoalId+status]').equals([goal.longTermGoalId, 'active']).count();
				if (activeCount > 0) throw new Error('ACTIVE_STAGE_GOAL_EXISTS');
			}
			return this.stageGoals.add(goal);
		});
	}

	findActiveLongTermGoal(userCardId: string): Promise<LongTermGoal | undefined> {
		return this.longTermGoals.where('[userCardId+status]').equals([userCardId, 'active']).first();
	}

	findActiveStageGoal(longTermGoalId: string): Promise<StageGoal | undefined> {
		return this.stageGoals.where('[longTermGoalId+status]').equals([longTermGoalId, 'active']).first();
	}

	putLongTermGoal(goal: LongTermGoal): Promise<string> {
		return this.longTermGoals.put(goal);
	}

	putStageGoal(goal: StageGoal): Promise<string> {
		return this.stageGoals.put(goal);
	}
}
