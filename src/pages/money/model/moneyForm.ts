/* eslint-disable i18next/no-literal-string -- Money validation uses the existing primary Chinese locale. */
import { useRef, useState } from 'react';
import { formatLocalDate, parseLocalDate } from '@shared/lib/date';
import { parseMoneyInputToCents } from '@shared/lib/money-input';

export function amountError(value: string, allowZero = false): string | undefined {
	const cents = parseMoneyInputToCents(value);
	return cents === undefined || (allowZero ? cents < 0 : cents <= 0)
		? (allowZero ? '请输入不小于零、最多两位小数的金额' : '请输入大于零、最多两位小数的金额') : undefined;
}

export function dateError(date: string): string | undefined {
	try { parseLocalDate(date); return undefined; } catch { return '请选择有效日期'; }
}

export function factError(date: string, time: string): string | undefined {
	if (dateError(date)) return '请选择有效日期';
	if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return '请选择有效时间';
	const now = new Date();
	const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
	return `${date} ${time}` > `${formatLocalDate(now)} ${currentTime}` ? '实际记录不能使用未来日期或时间' : undefined;
}

export function useMoneyMutation() {
	const pending = useRef(false);
	const [saving, setSaving] = useState(false);
	const [saveError, setSaveError] = useState('');
	async function run(action: () => Promise<void>) {
		if (pending.current) return;
		pending.current = true; setSaving(true); setSaveError('');
		try { await action(); } catch (error) {
			const message = error instanceof Error ? error.message : '';
			setSaveError(message === 'STALE_DEBT_CONFIRMATION' ? '该余额确认时间早于已有记录，请重新确认。' : message === 'SOURCE_ALREADY_LINKED' ? '这笔账目已关联其它账单，不能重复关联。' : '保存失败，修改仍保留在表单中，请检查后重试。');
		} finally { pending.current = false; setSaving(false); }
	}
	return { saving, saveError, run };
}

export function usePaymentSubmission() {
	const submission = useRef<{ fingerprint: string; id: string } | null>(null);
	return (input: object) => {
		const fingerprint = JSON.stringify(input);
		if (submission.current?.fingerprint !== fingerprint) submission.current = { fingerprint, id: crypto.randomUUID() };
		return submission.current.id;
	};
}
