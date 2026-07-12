import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const REQUIRED_FILES = ['LICENSE', 'README.md', 'SECURITY.md', 'CHANGELOG.md', 'THIRD_PARTY_NOTICES.md', 'release-assets.json'];
const UPSTREAM_SOURCE_URL = 'https://github.com/iNikAnn/DoHabit';

const sortedJson = (value) => JSON.stringify(value, Object.keys(value ?? {}).sort());
const addError = (errors, condition, message) => { if (!condition) errors.push(message); };

export function validateReleaseReadiness(snapshot, phase) {
	if (!['local', 'public'].includes(phase)) return [`phase must be local or public; received ${phase}`];
	const errors = [];
	const rootLock = snapshot.lockfile.packages?.[''] ?? {};

	addError(errors, snapshot.packageJson.version === '3.0.0-rc.1', 'release version must be 3.0.0-rc.1');
	addError(errors, snapshot.lockfile.version === snapshot.packageJson.version && rootLock.version === snapshot.packageJson.version, 'package and lockfile versions must match');
	addError(errors, snapshot.packageJson.private === true, 'package private must remain true');
	addError(errors, snapshot.packageJson.license === 'AGPL-3.0-only', 'package license must be AGPL-3.0-only');
	addError(errors, sortedJson(snapshot.packageJson.dependencies) === sortedJson(rootLock.dependencies), 'production dependency drift detected');
	addError(errors, sortedJson(snapshot.packageJson.devDependencies) === sortedJson(rootLock.devDependencies), 'development dependency drift detected');

	for (const file of REQUIRED_FILES) addError(errors, snapshot.requiredFiles[file], `required release file missing: ${file}`);
	const publicFiles = [...snapshot.publicFiles].sort();
	const listedAssets = snapshot.releaseAssets.assets
		.filter((asset) => asset.releaseStatus === 'included')
		.map((asset) => asset.path)
		.sort();
	addError(errors, JSON.stringify(publicFiles) === JSON.stringify(listedAssets), 'public asset ledger does not match public files');
	for (const asset of snapshot.releaseAssets.assets) addError(errors, asset.path && asset.source && asset.license && asset.releaseStatus, `asset ledger entry is incomplete: ${asset.path ?? 'unknown'}`);

	addError(errors, snapshot.projectLinks.upstream === UPSTREAM_SOURCE_URL, 'DoHabit upstream source must remain fixed');
	for (const [label, link] of Object.entries({ 'project source': snapshot.projectLinks.source, 'project Issues': snapshot.projectLinks.issues, 'project LICENSE': snapshot.projectLinks.license })) {
		addError(errors, link?.status === 'unavailable' || (link?.status === 'available' && /^https:\/\/github\.com\/[^/]+\/[^/]+(?:\/.*)?$/.test(link.url)), `${label} must be explicitly unavailable or a real GitHub URL`);
	}

	if (phase === 'public') {
		const source = snapshot.projectLinks.source;
		const issues = snapshot.projectLinks.issues;
		const license = snapshot.projectLinks.license;
		addError(errors, source?.status === 'available' && source.url !== UPSTREAM_SOURCE_URL, 'public phase requires a real project source URL separate from upstream');
		if (source?.status === 'available') {
			addError(errors, issues?.status === 'available' && issues.url === `${source.url}/issues`, 'project Issues URL must match project source');
			addError(errors, license?.status === 'available' && license.url === `${source.url}/blob/main/LICENSE`, 'project LICENSE URL must match project source');
			addError(errors, snapshot.packageJson.repository?.url === source.url, 'package repository must match project source');
			addError(errors, snapshot.packageJson.bugs?.url === `${source.url}/issues`, 'package bugs URL must match project Issues');
			addError(errors, snapshot.packageJson.homepage === source.url, 'package homepage must match project source');
		}
	}

	addError(errors, snapshot.pwaSource.includes("registerType: 'prompt'") && !snapshot.pwaSource.includes("registerType: 'autoUpdate'"), 'PWA must keep prompt updates without autoUpdate');
	addError(errors, /DATABASE_SCHEMA_VERSION\s*=\s*1\b/.test(snapshot.databaseSource), 'database schema must remain v1');
	addError(errors, /BACKUP_SCHEMA_VERSION\s*=\s*1\b/.test(snapshot.backupSource) && snapshot.backupSource.includes('repeat-outcome-backup'), 'backup schema and format must remain v1');
	addError(errors, /PBKDF2_ITERATIONS\s*=\s*600_000\b/.test(snapshot.cryptoSource), 'PBKDF2 iterations must remain 600000');
	addError(errors, snapshot.cryptoSource.includes("'AES-GCM'") && /keyLength:\s*256/.test(snapshot.cryptoSource), 'backup encryption must remain AES-GCM 256');

	for (const path of snapshot.distFiles) {
		if (path.endsWith('.map')) errors.push(`source map found in dist: ${path}`);
		if (/(?:^|\/)(?:\.env(?:\.|$)|logs?(?:\/|$)|old-app(?:\/|$))/.test(path.replace(/^dist\//, ''))) errors.push(`forbidden dist file: ${path}`);
	}
	if (/\bTEST\b|QA[_ -]?ONLY/.test(snapshot.distText)) errors.push('QA marker found in dist');
	if (/BEGIN (?:RSA |EC )?PRIVATE KEY|(?:github_pat|ghp|sk)-[A-Za-z0-9_-]{12,}/.test(snapshot.distText)) errors.push('secret-like string found in dist');

	return errors.filter(Boolean);
}

const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'));
const listFiles = (root, directory) => readdirSync(directory, { recursive: true, withFileTypes: true })
	.filter((entry) => entry.isFile())
	.map((entry) => relative(root, join(entry.parentPath ?? entry.path, entry.name)).replaceAll('\\', '/'))
	.sort();

function parseLink(source, name) {
	const match = new RegExp(`export const ${name} = \\{ status: '([^']+)'(?:, url: '([^']+)')?`).exec(source);
	return match?.[1] === 'available' ? { status: 'available', url: match[2] } : { status: 'unavailable' };
}

export function loadCurrentReleaseSnapshot(root = process.cwd()) {
	const linksSource = readFileSync(resolve(root, 'src/shared/config/links.ts'), 'utf8');
	const upstream = /UPSTREAM_SOURCE_URL\s*=\s*'([^']+)'/.exec(linksSource)?.[1];
	const dist = resolve(root, 'dist');
	const distFiles = existsSync(dist) ? listFiles(root, dist) : [];
	const textExtensions = /\.(?:html|js|css|json|webmanifest|svg|txt)$/;
	const distText = distFiles.filter((path) => textExtensions.test(path)).map((path) => readFileSync(resolve(root, path), 'utf8')).join('\n');
	return {
		packageJson: readJson(resolve(root, 'package.json')),
		lockfile: readJson(resolve(root, 'package-lock.json')),
		projectLinks: {
			upstream,
			source: parseLink(linksSource, 'PROJECT_SOURCE'),
			issues: parseLink(linksSource, 'PROJECT_ISSUES'),
			license: parseLink(linksSource, 'PROJECT_LICENSE'),
		},
		requiredFiles: Object.fromEntries(REQUIRED_FILES.map((name) => [name, existsSync(resolve(root, name))])),
		publicFiles: listFiles(root, resolve(root, 'public')),
		releaseAssets: readJson(resolve(root, 'release-assets.json')),
		distFiles,
		distText,
		pwaSource: readFileSync(resolve(root, 'vite.config.ts'), 'utf8'),
		databaseSource: readFileSync(resolve(root, 'src/shared/lib/db/repeatOutcomeDatabase.ts'), 'utf8'),
		backupSource: readFileSync(resolve(root, 'src/entities/backup/model/types.ts'), 'utf8'),
		cryptoSource: readFileSync(resolve(root, 'src/shared/lib/crypto/backup-crypto/backupCrypto.ts'), 'utf8'),
	};
}

export function run(root = process.cwd(), phase = 'local') {
	const errors = validateReleaseReadiness(loadCurrentReleaseSnapshot(root), phase);
	if (!errors.length) {
		console.log(`Release readiness (${phase}) passed.`);
		return 0;
	}
	for (const error of errors) console.error(`- ${error}`);
	return 1;
}

const phaseArgument = process.argv.find((argument) => argument.startsWith('--phase='));
const phase = phaseArgument?.slice('--phase='.length) ?? 'local';
const currentFile = fileURLToPath(import.meta.url).toLowerCase();
const invokedFile = process.argv[1] ? resolve(process.argv[1]).toLowerCase() : '';
if (currentFile === invokedFile) process.exitCode = run(process.cwd(), phase);
