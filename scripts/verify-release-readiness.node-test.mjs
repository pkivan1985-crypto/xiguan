import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import test from 'node:test';

const root = fileURLToPath(new URL('..', import.meta.url));
const verifierPath = join(root, 'scripts', 'verify-release-readiness.mjs');
const approvedPackage = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const approvedLockfile = JSON.parse(readFileSync(join(root, 'package-lock.json'), 'utf8'));

function validSnapshot() {
	const dependencies = { ...approvedPackage.dependencies };
	const devDependencies = { ...approvedPackage.devDependencies };
	return {
		packageJson: { version: '3.0.0-rc.1', private: true, license: 'AGPL-3.0-only', dependencies, devDependencies, overrides: { ...approvedPackage.overrides } },
		lockfile: { version: '3.0.0-rc.1', packages: structuredClone(approvedLockfile.packages) },
		projectLinks: {
			upstream: 'https://github.com/iNikAnn/DoHabit',
			source: { status: 'unavailable' }, issues: { status: 'unavailable' }, license: { status: 'unavailable' },
		},
		requiredFiles: Object.fromEntries(['LICENSE', 'README.md', 'SECURITY.md', 'CHANGELOG.md', 'THIRD_PARTY_NOTICES.md', 'release-assets.json'].map((name) => [name, true])),
		releaseDocs: {
			readme: '公开候选站：https://repeat-outcome.pages.dev 项目源码：https://github.com/example-owner/repeat-outcome',
			changelog: '3.0.0-rc.1 公开候选版本已部署到 https://repeat-outcome.pages.dev',
		},
		publicFiles: ['public/_headers', 'public/_redirects', 'public/favicon.svg', 'public/robots.txt'],
		releaseAssets: { assets: ['public/_headers', 'public/_redirects', 'public/favicon.svg', 'public/robots.txt'].map((path) => ({ path, source: 'project', license: 'AGPL-3.0-only', releaseStatus: 'included' })) },
		distExists: true,
		distFiles: ['dist/_headers', 'dist/_redirects', 'dist/favicon.svg', 'dist/index.html', 'dist/manifest.webmanifest', 'dist/robots.txt', 'dist/sw.js', 'dist/assets/index-test.js'],
		distText: '<html>repeat outcome</html>',
		pwaSource: "registerType: 'prompt'",
		databaseSource: 'export const DATABASE_SCHEMA_VERSION = 1;',
		backupSource: "export const BACKUP_SCHEMA_VERSION = 1 as const; export const BACKUP_FORMAT = 'repeat-outcome-backup' as const;",
		cryptoSource: "const PBKDF2_ITERATIONS = 600_000 as const; 'AES-GCM'; keyLength: 256",
	};
}

test('release readiness verifier exists', () => {
	assert.equal(existsSync(verifierPath), true, 'missing scripts/verify-release-readiness.mjs');
});

test('local phase accepts an explicit unavailable project repository while preserving invariants', async (context) => {
	if (!existsSync(verifierPath)) return context.skip('verifier does not exist yet');
	const { validateReleaseReadiness } = await import(pathToFileURL(verifierPath).href);
	assert.deepEqual(validateReleaseReadiness(validSnapshot(), 'local'), []);
});

test('public phase requires real mutually consistent project URLs', async (context) => {
	if (!existsSync(verifierPath)) return context.skip('verifier does not exist yet');
	const { validateReleaseReadiness } = await import(pathToFileURL(verifierPath).href);
	const pending = validSnapshot();
	assert.ok(validateReleaseReadiness(pending, 'public').some((error) => error.includes('project source')));

	const ready = validSnapshot();
	const source = 'https://github.com/example-owner/repeat-outcome';
	ready.projectLinks.source = { status: 'available', url: source };
	ready.projectLinks.issues = { status: 'available', url: `${source}/issues` };
	ready.projectLinks.license = { status: 'available', url: `${source}/blob/main/LICENSE` };
	ready.packageJson.repository = { type: 'git', url: source };
	ready.packageJson.bugs = { url: `${source}/issues` };
	ready.packageJson.homepage = source;
	assert.deepEqual(validateReleaseReadiness(ready, 'public'), []);
	ready.projectLinks.issues.url = 'https://github.com/iNikAnn/DoHabit/issues';
	assert.ok(validateReleaseReadiness(ready, 'public').some((error) => error.includes('project Issues')));
});

test('public phase rejects release docs that still claim the project is local-only', async (context) => {
	if (!existsSync(verifierPath)) return context.skip('verifier does not exist yet');
	const { validateReleaseReadiness } = await import(pathToFileURL(verifierPath).href);
	const snapshot = validSnapshot();
	const source = 'https://github.com/example-owner/repeat-outcome';
	snapshot.projectLinks.source = { status: 'available', url: source };
	snapshot.projectLinks.issues = { status: 'available', url: `${source}/issues` };
	snapshot.projectLinks.license = { status: 'available', url: `${source}/blob/main/LICENSE` };
	snapshot.packageJson.repository = { type: 'git', url: source };
	snapshot.packageJson.bugs = { url: `${source}/issues` };
	snapshot.packageJson.homepage = source;
	snapshot.releaseDocs.readme = '当前版本为本地候选，项目尚未创建公开仓库或部署正式网站。';
	snapshot.releaseDocs.changelog = '此版本仍处于本地发布准备阶段，尚未部署网站。';
	const errors = validateReleaseReadiness(snapshot, 'public').join('\n');
	assert.match(errors, /README.*公开候选/i);
	assert.match(errors, /CHANGELOG.*公开候选/i);
});

test('dependency, data-format, PWA, asset, and dist drift fail loudly', async (context) => {
	if (!existsSync(verifierPath)) return context.skip('verifier does not exist yet');
	const { validateReleaseReadiness } = await import(pathToFileURL(verifierPath).href);
	const snapshot = validSnapshot();
	snapshot.lockfile.packages[''].dependencies.react = '^19.2.0';
	snapshot.pwaSource = "registerType: 'autoUpdate'";
	snapshot.databaseSource = 'export const DATABASE_SCHEMA_VERSION = 2;';
	snapshot.backupSource = 'export const BACKUP_SCHEMA_VERSION = 2 as const;';
	snapshot.cryptoSource = 'PBKDF2 1_000 AES-CBC 128';
	snapshot.releaseAssets.assets.pop();
	snapshot.distFiles.push('dist/app.js.map', 'dist/.env');
	snapshot.distText = 'TEST BEGIN PRIVATE KEY';
	const errors = validateReleaseReadiness(snapshot, 'local').join('\n');
	for (const marker of ['dependency drift', 'prompt', 'database schema', 'backup schema', 'PBKDF2', 'asset ledger', 'source map', 'forbidden dist file', 'QA marker', 'secret-like']) {
		assert.match(errors, new RegExp(marker, 'i'));
	}
});

test('synchronized dependency changes and incomplete or unexpected dist fail loudly', async (context) => {
	if (!existsSync(verifierPath)) return context.skip('verifier does not exist yet');
	const { validateReleaseReadiness } = await import(pathToFileURL(verifierPath).href);
	const snapshot = validSnapshot();
	snapshot.packageJson.dependencies['unapproved-package'] = '1.0.0';
	snapshot.lockfile.packages[''].dependencies['unapproved-package'] = '1.0.0';
	snapshot.distExists = false;
	snapshot.distFiles = [];
	let errors = validateReleaseReadiness(snapshot, 'local').join('\n');
	assert.match(errors, /approved dependency baseline/i);
	assert.match(errors, /dist directory/i);

	const unexpected = validSnapshot();
	unexpected.distFiles.push('dist/debug.txt');
	errors = validateReleaseReadiness(unexpected, 'local').join('\n');
	assert.match(errors, /unexpected dist file/i);
});

test('override and transitive lock graph drift fail against the approved baseline', async (context) => {
	if (!existsSync(verifierPath)) return context.skip('verifier does not exist yet');
	const { validateReleaseReadiness } = await import(pathToFileURL(verifierPath).href);
	const snapshot = validSnapshot();
	snapshot.packageJson.overrides.sharp = '^0.34.0';
	const transitive = Object.keys(snapshot.lockfile.packages).find((path) => path !== '');
	snapshot.lockfile.packages[transitive].version = '0.0.0-review-drift';
	const errors = validateReleaseReadiness(snapshot, 'local').join('\n');
	assert.match(errors, /approved override baseline/i);
	assert.match(errors, /approved transitive lockfile baseline/i);
});

test('package scripts, pinned CI workflow, and static host rules match the release baseline', () => {
	const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
	assert.equal(pkg.scripts['check:release'], 'node scripts/verify-release-readiness.mjs');
	assert.equal(pkg.scripts['test:release'], 'node --test scripts/verify-release-readiness.node-test.mjs scripts/generate-third-party-notices.node-test.mjs');

	const workflowPath = join(root, '.github', 'workflows', 'verify.yml');
	assert.equal(existsSync(workflowPath), true, 'missing CI workflow');
	if (existsSync(workflowPath)) {
		const workflow = readFileSync(workflowPath, 'utf8');
		for (const expected of [
			'contents: read', 'timeout-minutes:', 'verify:', 'npm ci', 'npm run verify',
			'npm run check:release -- --phase=public',
			'actions/checkout@df4cb1c069e1874edd31b4311f1884172cec0e10',
			'actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020',
		]) assert.match(workflow, new RegExp(expected.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
	}

	const redirects = readFileSync(join(root, 'public', '_redirects'), 'utf8');
	assert.match(redirects, /\/\* \/index\.html 200/);
	const headers = readFileSync(join(root, 'public', '_headers'), 'utf8');
	assert.match(headers, /X-Content-Type-Options: nosniff/);
	assert.match(headers, /Referrer-Policy: strict-origin-when-cross-origin/);
	assert.match(headers, /Permissions-Policy: camera=\(\), microphone=\(\), geolocation=\(\)/);
	assert.doesNotMatch(headers, /Content-Security-Policy/);
	const security = readFileSync(join(root, 'SECURITY.md'), 'utf8');
	assert.match(security, /https:\/\/github\.com\/pkivan1985-crypto\/xiguan\/issues/);
	assert.doesNotMatch(security, /Issues 地址将在候选发布仓库建立后补充/);
});
