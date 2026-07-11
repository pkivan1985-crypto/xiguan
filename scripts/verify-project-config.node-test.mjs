import assert from 'node:assert/strict';
import test from 'node:test';

import {
	EXPECTED_DEPENDENCIES,
	EXPECTED_DEV_DEPENDENCIES,
	npmVersionFromUserAgent,
	validateProjectConfig,
} from './verify-project-config.mjs';

function validInput() {
	const dependencies = { ...EXPECTED_DEPENDENCIES };
	const devDependencies = { ...EXPECTED_DEV_DEPENDENCIES };
	return {
		packageJson: { packageManager: 'npm@11.18.0', engines: { node: '24.17.0', npm: '11.18.0' }, scripts: { 'lint:css': 'stylelint "src/**/*.css"' }, dependencies, devDependencies },
		lockfile: { lockfileVersion: 3, packages: { '': { dependencies, devDependencies } } },
		nodeVersion: 'v24.17.0', npmVersion: '11.18.0', nodeVersionFile: '24.17.0\n', npmrc: 'engine-strict=true\n',
	};
}

test('accepts the approved M0.1 configuration', () => assert.deepEqual(validateProjectConfig(validInput()), []));
test('reports runtime, script, and forbidden dependency drift', () => {
	const input = validInput(); input.nodeVersion = 'v22.22.3'; input.packageJson.scripts['lint:css'] = "stylelint 'src/**/*.css'"; input.packageJson.devDependencies['cross-var'] = '^1.1.0';
	const errors = validateProjectConfig(input);
	assert.ok(errors.includes('Node.js must be v24.17.0; received v22.22.3'));
	assert.ok(errors.includes('lint:css must be stylelint "src/**/*.css"'));
	assert.ok(errors.includes('Forbidden direct dependency: cross-var'));
});
test('reports package metadata and lockfile drift', () => {
	const input = validInput(); input.packageJson.packageManager = 'npm@10.9.8'; input.packageJson.dependencies.react = '^19.2.0'; input.lockfile.packages[''].dependencies.react = '^19.2.0'; input.lockfile.lockfileVersion = 2;
	const errors = validateProjectConfig(input);
	assert.ok(errors.includes('packageManager must be npm@11.18.0; received npm@10.9.8'));
	assert.ok(errors.includes('dependencies.react must be 19.2.7; received ^19.2.0'));
	assert.ok(errors.includes('package-lock root dependencies.react must be 19.2.7; received ^19.2.0'));
	assert.ok(errors.includes('package-lock lockfileVersion must be 3; received 2'));
});
test('requires the approved M2 data dependencies at exact versions', () => {
	const input = validInput();
	delete input.packageJson.dependencies.dexie;
	delete input.lockfile.packages[''].dependencies.dexie;
	delete input.packageJson.devDependencies['fake-indexeddb'];
	delete input.lockfile.packages[''].devDependencies['fake-indexeddb'];
	const errors = validateProjectConfig(input);
	assert.ok(errors.includes('dependencies.dexie must be 4.4.4; received undefined'));
	assert.ok(errors.includes('package-lock root dependencies.dexie must be 4.4.4; received undefined'));
	assert.ok(errors.includes('devDependencies.fake-indexeddb must be 6.2.5; received undefined'));
	assert.ok(errors.includes('package-lock root devDependencies.fake-indexeddb must be 6.2.5; received undefined'));
});
test('extracts npm version from the npm user agent', () => {
	assert.equal(npmVersionFromUserAgent('npm/11.18.0 node/v24.17.0 win32 x64'), '11.18.0');
	assert.equal(npmVersionFromUserAgent(''), '');
});
