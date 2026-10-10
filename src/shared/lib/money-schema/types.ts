export type MoneyCategory = 'creditCard' | 'loan' | 'fixedExpense';
export interface DebtAccount {
	id: string; category: 'creditCard' | 'loan'; title: string;
	balanceCents?: number; confirmedAt?: string; stopped: boolean;
}
export interface MoneyTemplate {
	id: string; category: MoneyCategory; title: string; accountId?: string;
	dayOfMonth: number; amountCents: number; startMonth: string; active: boolean; note: string;
}
export interface MoneyBill {
	id: string; category: MoneyCategory; title: string; month: string; dueDate: string;
	amountCents: number; accountId?: string; templateId?: string; note: string;
}
export interface MoneyPayment {
	id: string; billId: string; amountCents: number; localDate: string; occurredTime: string;
	accountLabel: string; note: string; sourceId: string; ownedEntryId?: string;
	effective: boolean; sourceUnavailable?: boolean; revokedAt?: string;
}
export interface MoneyEntry {
	id: string; sourceId: string; type: 'income' | 'expense' | 'repayment';
	date: string; time: string; item: string; categoryLabel: string; accountLabel: string;
	note: string; amountCents: number; editUrl?: string;
}
export interface StoredMoneyEntry extends Omit<MoneyEntry, 'editUrl'> { revokedAt?: string }
export interface MoneySubmission {
	submissionId: string; paymentId: string; fingerprint: string; operation: 'save' | 'link';
}
export interface MoneyState {
	version: 1; accounts: DebtAccount[]; templates: MoneyTemplate[]; bills: MoneyBill[];
	payments: MoneyPayment[]; entries: StoredMoneyEntry[]; completedMonths: string[];
	submissions: MoneySubmission[];
}
export interface MoneyView {
	accounts: DebtAccount[]; templates: MoneyTemplate[]; bills: MoneyBill[];
	payments: MoneyPayment[]; entries: MoneyEntry[]; completedMonths: string[];
}
