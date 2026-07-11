import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

export const EXPECTED_DEPENDENCIES = Object.freeze({ dexie: '4.4.4', 'framer-motion': '12.42.2', react: '19.2.7', 'react-dom': '19.2.7', 'react-router': '7.18.1', zustand: '5.0.14' });
export const EXPECTED_DEV_DEPENDENCIES = Object.freeze({ '@testing-library/react': '16.3.2', '@vitejs/plugin-react': '6.0.3', 'fake-indexeddb': '6.2.5', typescript: '6.0.3', vite: '8.1.4', 'vite-plugin-pwa': '1.3.0', vitest: '4.1.10' });
const FORBIDDEN_DEPENDENCIES = ['cross-var', 'gh-pages', 'wrangler'];
const FORBIDDEN_SCRIPTS = ['deploy:test', 'deploy:prod'];

export function npmVersionFromUserAgent(userAgent) { return /^npm\/([^\s]+)/.exec(userAgent)?.[1] ?? ''; }
function checkEqual(errors, label, actual, expected) { if (actual !== expected) errors.push(`${label} must be ${expected}; received ${String(actual)}`); }

export function validateProjectConfig({ packageJson, lockfile, nodeVersion, npmVersion, nodeVersionFile, npmrc }) {
	const errors = [];
	const rootLock = lockfile.packages?.[''] ?? {};
	const allDirect = { ...(packageJson.dependencies ?? {}), ...(packageJson.devDependencies ?? {}) };
	checkEqual(errors, 'Node.js', nodeVersion, 'v24.17.0');
	checkEqual(errors, 'npm', npmVersion, '11.18.0');
	checkEqual(errors, '.node-version', nodeVersionFile.trim(), '24.17.0');
	checkEqual(errors, 'packageManager', packageJson.packageManager, 'npm@11.18.0');
	checkEqual(errors, 'engines.node', packageJson.engines?.node, '24.17.0');
	checkEqual(errors, 'engines.npm', packageJson.engines?.npm, '11.18.0');
	checkEqual(errors, 'package-lock lockfileVersion', lockfile.lockfileVersion, 3);
	const npmrcLines = npmrc.split(/\r?\n/).map((line) => line.trim()).filter((line) => line && !line.startsWith('#'));
	if (!npmrcLines.includes('engine-strict=true')) errors.push('.npmrc must contain engine-strict=true');
	if (packageJson.scripts?.['lint:css'] !== 'stylelint "src/**/*.css"') errors.push('lint:css must be stylelint "src/**/*.css"');
	for (const script of FORBIDDEN_SCRIPTS) if (Object.hasOwn(packageJson.scripts ?? {}, script)) errors.push(`Forbidden script: ${script}`);
	for (const dependency of FORBIDDEN_DEPENDENCIES) if (Object.hasOwn(allDirect, dependency)) errors.push(`Forbidden direct dependency: ${dependency}`);
	for (const [name, expected] of Object.entries(EXPECTED_DEPENDENCIES)) {
		checkEqual(errors, `dependencies.${name}`, packageJson.dependencies?.[name], expected);
		checkEqual(errors, `package-lock root dependencies.${name}`, rootLock.dependencies?.[name], expected);
	}
	for (const [name, expected] of Object.entries(EXPECTED_DEV_DEPENDENCIES)) {
		checkEqual(errors, `devDependencies.${name}`, packageJson.devDependencies?.[name], expected);
		checkEqual(errors, `package-lock root devDependencies.${name}`, rootLock.devDependencies?.[name], expected);
	}
	return errors;
}

function readJson(path) { return JSON.parse(readFileSync(path, 'utf8')); }
export function loadCurrentProject(root = process.cwd()) {
	return { packageJson: readJson(resolve(root, 'package.json')), lockfile: readJson(resolve(root, 'package-lock.json')), nodeVersion: process.version, npmVersion: npmVersionFromUserAgent(process.env.npm_config_user_agent ?? ''), nodeVersionFile: readFileSync(resolve(root, '.node-version'), 'utf8'), npmrc: readFileSync(resolve(root, '.npmrc'), 'utf8') };
}
export function run(root = process.cwd()) {
	const errors = validateProjectConfig(loadCurrentProject(root));
	if (!errors.length) { console.log('Project configuration matches the approved M0.1 baseline.'); return 0; }
	for (const error of errors) console.error(`- ${error}`);
	return 1;
}
const currentFile = fileURLToPath(import.meta.url).toLowerCase();
const invokedFile = process.argv[1] ? resolve(process.argv[1]).toLowerCase() : '';
if (currentFile === invokedFile) process.exitCode = run();
