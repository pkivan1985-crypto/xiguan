import assert from 'node:assert/strict';
import test from 'node:test';

import { findCssPropertyOrderIssues } from './lint-css-order.mjs';

test('accepts Recess ordered declarations and leaves custom properties in place', () => {
	assert.deepEqual(findCssPropertyOrderIssues(`.card {
	--surface: #101820;
	position: relative;
	display: flex;
	width: 100%;
	color: white;
	background: var(--surface);
}`), []);
});

test('rejects a known CSS property that moves ahead of an earlier Recess group', () => {
	const issues = findCssPropertyOrderIssues('.card { color: white; display: flex; }', 'Card.module.css');
	assert.equal(issues.length, 1);
	assert.match(issues[0].message, /"display" is out of order after "color"/);
});

test('checks declaration order inside nested rules and at-rules', () => {
	const issues = findCssPropertyOrderIssues('@media (width > 1px) { .card { background: black; position: fixed; } }');
	assert.equal(issues.length, 1);
	assert.match(issues[0].message, /"position" is out of order after "background"/);
});

test('requires new standard CSS properties to be classified and ignores custom properties', () => {
	const issues = findCssPropertyOrderIssues('.card { --local: 1; display: flex; future-property: value; }');
	assert.equal(issues.length, 1);
	assert.match(issues[0].message, /Unclassified CSS property "future-property"/);
});

test('requires prefixed declarations before the corresponding unprefixed declaration', () => {
	assert.deepEqual(findCssPropertyOrderIssues('.card { -webkit-transform: none; transform: none; }'), []);
	const issues = findCssPropertyOrderIssues('.card { transform: none; -webkit-transform: none; }');
	assert.equal(issues.length, 1);
	assert.match(issues[0].message, /must precede its unprefixed form/);
});

test('reports malformed CSS with a file and source line', () => {
	const issues = findCssPropertyOrderIssues('.card {\n color: red;\n', 'Card.module.css');
	assert.equal(issues.length, 1);
	assert.equal(issues[0].filePath, 'Card.module.css');
	assert.equal(issues[0].line, 1);
	assert.match(issues[0].message, /CSS parse error/);
});
