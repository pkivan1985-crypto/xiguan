import type { ChangeEvent, ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { MoneyAmountField, MoneyField } from './MoneyFields';

describe('money form fields', () => {
	it.each(['8.', '8.0', '8.05', '0.50', '12.30', '', '8.055', '-1'])('forwards raw input %s without formatting or moving focus', (value) => {
		const onChange = vi.fn();
		const field = MoneyAmountField({ id: 'amount', label: '金额', value: '', onChange });
		const input = field.props.children as ReactElement<{ onChange: (event: ChangeEvent<HTMLInputElement>) => void; type: string; inputMode: string }>;
		input.props.onChange({ currentTarget: { value } } as ChangeEvent<HTMLInputElement>);
		expect(onChange).toHaveBeenCalledExactlyOnceWith(value);
		expect(input.props.type).toBe('text');
		expect(input.props.inputMode).toBe('decimal');
	});

	it('links field errors to the input and keeps a visible label', () => {
		const html = renderToStaticMarkup(<MoneyAmountField id='amount' label='本期计划金额' value='-1' onChange={() => {}} error='金额必须大于零' />);
		expect(html).toContain('for="amount"');
		expect(html).toContain('aria-invalid="true"');
		expect(html).toContain('aria-describedby="amount-error"');
		expect(html).toContain('role="alert"');
		expect(html).toContain('金额必须大于零');
	});

	it('keeps hint and error available together', () => {
		const html = renderToStaticMarkup(<MoneyField id='name' label='项目名称' hint='必填' error='请填写名称'><input id='name' /></MoneyField>);
		expect(html).toContain('name-hint');
		expect(html).toContain('name-error');
	});
});
