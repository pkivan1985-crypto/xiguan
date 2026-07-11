export type UserCardStatus = 'active' | 'archived';

export interface UserCard {
	id: string;
	officialCardId: string;
	title: string;
	status: UserCardStatus;
	sortOrder: number;
	createdAt: string;
	updatedAt: string;
}
