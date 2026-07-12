import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import test from 'node:test';

const root = fileURLToPath(new URL('..', import.meta.url));
const generatorPath = join(root, 'scripts', 'generate-third-party-notices.mjs');

const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'));
const listFiles = (directory) => readdirSync(directory, { recursive: true, withFileTypes: true })
	.filter((entry) => entry.isFile())
	.map((entry) => relative(root, join(entry.parentPath ?? entry.path, entry.name)).replaceAll('\\', '/'))
	.sort();

test('release documentation and deterministic notice generator exist', () => {
	for (const path of [
		generatorPath,
		join(root, 'THIRD_PARTY_NOTICES.md'),
		join(root, 'release-assets.json'),
		join(root, 'SECURITY.md'),
		join(root, 'CHANGELOG.md'),
	]) {
		assert.equal(existsSync(path), true, `missing release file: ${relative(root, path)}`);
	}
});

test('notice generation is deterministic and covers every direct dependency', async (context) => {
	if (!existsSync(generatorPath)) {
		context.skip('generator does not exist yet');
		return;
	}

	const { collectThirdPartyPackages, renderThirdPartyNotices } = await import(pathToFileURL(generatorPath).href);
	const packageJson = readJson(join(root, 'package.json'));
	const lockfile = readJson(join(root, 'package-lock.json'));
	const packages = collectThirdPartyPackages({ packageJson, lockfile, nodeModulesPath: join(root, 'node_modules') });
	const first = renderThirdPartyNotices(packages);
	const second = renderThirdPartyNotices(packages);

	assert.equal(first, second);
	assert.equal(readFileSync(join(root, 'THIRD_PARTY_NOTICES.md'), 'utf8'), first);
	for (const dependency of [...Object.keys(packageJson.dependencies), ...Object.keys(packageJson.devDependencies)]) {
		assert.ok(packages.some((entry) => entry.name === dependency), `missing direct dependency: ${dependency}`);
	}
	assert.ok(packages.every((entry) => entry.name && entry.version && entry.license));
});

test('unknown or missing licenses fail loudly', async (context) => {
	if (!existsSync(generatorPath)) {
		context.skip('generator does not exist yet');
		return;
	}

	const { collectThirdPartyPackages } = await import(pathToFileURL(generatorPath).href);
	assert.throws(() => collectThirdPartyPackages({
		packageJson: { dependencies: { mystery: '1.0.0' }, devDependencies: {} },
		lockfile: { packages: { 'node_modules/mystery': { version: '1.0.0', license: 'UNKNOWN' } } },
		nodeModulesPath: join(root, 'node_modules'),
	}), /unrecognized license/i);
});

test('every public file is included in the machine-readable release asset ledger', () => {
	const ledgerPath = join(root, 'release-assets.json');
	assert.equal(existsSync(ledgerPath), true, 'missing release-assets.json');
	if (!existsSync(ledgerPath)) return;

	const ledger = readJson(ledgerPath);
	const listed = ledger.assets
		.filter((asset) => asset.releaseStatus === 'included')
		.map((asset) => asset.path)
		.sort();
	assert.deepEqual(listed, listFiles(join(root, 'public')));
	for (const asset of ledger.assets) {
		assert.ok(asset.path && asset.source && asset.license && asset.releaseStatus);
	}
});

test('release docs have no fake owner or support address and templates protect private data', () => {
	const docs = ['README.md', 'SECURITY.md', 'CHANGELOG.md']
		.filter((path) => existsSync(join(root, path)))
		.map((path) => readFileSync(join(root, path), 'utf8'))
		.join('\n');
	assert.doesNotMatch(docs, /YOUR[_ -]?OWNER|example\.com|TODO/i);

	for (const template of ['bug_report.md', 'feature_request.md']) {
		const contents = readFileSync(join(root, '.github', 'ISSUE_TEMPLATE', template), 'utf8');
		assert.match(contents, /不要上传.*备份.*个人数据/);
	}
});

test('unapproved upstream display assets are excluded from public output', () => {
	for (const path of [
		'public/assets/img/Repo-Card-Template.jpg',
		'public/assets/img/welcome-hero-screenshot.webp',
		'public/assets/brand/logo192-alpha.png',
	]) {
		assert.equal(existsSync(join(root, path)), false, `unapproved release asset remains: ${path}`);
	}
});
