import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const RECOGNIZED_LICENSES = new Set([
	'(MIT OR CC0-1.0)',
	'0BSD',
	'Apache-2.0',
	'Apache-2.0 AND LGPL-3.0-or-later',
	'Apache-2.0 AND LGPL-3.0-or-later AND MIT',
	'BSD-2-Clause',
	'BSD-3-Clause',
	'BlueOak-1.0.0',
	'CC-BY-4.0',
	'CC0-1.0',
	'ISC',
	'LGPL-3.0-or-later',
	'MIT',
	'MIT-0',
	'MPL-2.0',
	'Python-2.0',
]);

const getPackageName = (packagePath) => {
	const relativePath = packagePath.split('node_modules/').at(-1);
	const segments = relativePath.split('/');
	return relativePath.startsWith('@') ? segments.slice(0, 2).join('/') : segments[0];
};

const readInstalledLicense = (nodeModulesPath, name) => {
	try {
		const metadata = JSON.parse(readFileSync(join(nodeModulesPath, ...name.split('/'), 'package.json'), 'utf8'));
		if (typeof metadata.license === 'string') return metadata.license;
		if (Array.isArray(metadata.licenses) && metadata.licenses.length === 1) return metadata.licenses[0]?.type;
	} catch {
		return undefined;
	}
	return undefined;
};

export function collectThirdPartyPackages({ lockfile, nodeModulesPath }) {
	return Object.entries(lockfile.packages)
		.filter(([packagePath]) => packagePath.includes('node_modules/'))
		.map(([packagePath, metadata]) => {
			const name = getPackageName(packagePath);
			const license = metadata.license ?? readInstalledLicense(nodeModulesPath, name);
			if (!RECOGNIZED_LICENSES.has(license)) {
				throw new Error(`Unrecognized license for ${name}@${metadata.version}: ${license ?? 'missing'}`);
			}
			return { name, version: metadata.version, license, packagePath };
		})
		.sort((left, right) => left.name.localeCompare(right.name, 'en')
			|| left.version.localeCompare(right.version, 'en')
			|| left.packagePath.localeCompare(right.packagePath, 'en'));
}

export function renderThirdPartyNotices(packages) {
	const entries = packages.map(({ name, version, license }) => `- \`${name}@${version}\` — ${license}`).join('\n');
	return `# 第三方软件告知\n\n本项目以 [DoHabit](https://github.com/iNikAnn/DoHabit) 为主代码底座，并依据 AGPL-3.0 发布本项目修改后的对应源代码。\n\n以下清单由 \`package-lock.json\` 和本机已安装包元数据确定性生成，不使用在线许可证服务。许可证标识用于归档与审计；各依赖仍由其各自作者持有版权。\n\n## npm 依赖\n\n${entries}\n`;
}

function main() {
	const root = fileURLToPath(new URL('..', import.meta.url));
	const packageJson = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
	const lockfile = JSON.parse(readFileSync(join(root, 'package-lock.json'), 'utf8'));
	const packages = collectThirdPartyPackages({ packageJson, lockfile, nodeModulesPath: join(root, 'node_modules') });
	writeFileSync(join(root, 'THIRD_PARTY_NOTICES.md'), renderThirdPartyNotices(packages), 'utf8');
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
