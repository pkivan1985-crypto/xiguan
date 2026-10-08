import { readFileSync, readdirSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import postcss from 'postcss';

// Derived Recess property ordering from stylelint-config-recess-order@7.7.0.
// Keep this list aligned with declarations used in src/**/*.css; unclassified
// standard properties fail closed until they are deliberately assigned a rank.
export const RECESS_ORDERED_PROPERTIES = Object.freeze([
	'composes', 'all',
	'position', 'inset', 'top', 'right', 'bottom', 'left', 'z-index',
	'box-sizing', 'display',
	'flex', 'flex-grow', 'flex-shrink', 'flex-basis', 'flex-flow', 'flex-direction', 'flex-wrap', '-webkit-box-orient',
	'grid', 'grid-area', 'grid-template', 'grid-template-areas', 'grid-template-rows', 'grid-template-columns', 'grid-row', 'grid-row-start', 'grid-row-end', 'grid-column', 'grid-column-start', 'grid-column-end', 'grid-auto-rows', 'grid-auto-columns', 'grid-auto-flow', 'grid-gap', 'grid-row-gap', 'grid-column-gap',
	'gap', 'row-gap', 'column-gap', 'place-content', 'place-items', 'align-content', 'align-items', 'align-self', 'justify-content', 'justify-items', 'justify-self',
	'order',
	'width', 'min-width', 'max-width', 'height', 'min-height', 'max-height', 'aspect-ratio',
	'padding', 'padding-block', 'padding-block-start', 'padding-block-end', 'padding-inline', 'padding-inline-start', 'padding-inline-end', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
	'margin', 'margin-block', 'margin-block-start', 'margin-block-end', 'margin-inline', 'margin-inline-start', 'margin-inline-end', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
	'container-type',
	'overflow', 'overflow-x', 'overflow-y', 'text-overflow', 'scroll-behavior', 'overscroll-behavior', 'overscroll-behavior-x', 'overscroll-behavior-y',
	'font', 'font-family', 'font-size', 'font-style', 'font-weight', 'font-variant', 'font-variant-numeric', 'font-synthesis', 'line-height', 'vertical-align',
	'color', 'text-align', 'letter-spacing', 'text-wrap', 'overflow-wrap', 'white-space', 'text-decoration',
	'appearance', 'accent-color', 'pointer-events', 'touch-action', 'cursor', 'resize', 'outline', 'outline-offset', 'color-scheme',
	'content', 'list-style', 'scrollbar-width', 'object-fit',
	'background', 'background-color', 'background-image', 'background-size', 'border', 'border-color', 'border-width', 'border-top', 'border-right', 'border-bottom', 'border-left', 'border-radius', 'box-shadow',
	'isolation', 'opacity', 'filter', 'backdrop-filter', 'clip-path', 'stroke-width', 'text-rendering', 'transform', 'transition', 'transition-duration', 'animation', 'animation-duration', 'animation-iteration-count', 'will-change'
]);

const propertyRanks = new Map(RECESS_ORDERED_PROPERTIES.map((property, index) => [property, index]));
const vendorPrefixPattern = /^-(?:webkit|moz|ms|o)-/;

export function findCssPropertyOrderIssues(source, filePath = 'stylesheet.css') {
	let root;
	try {
		root = postcss.parse(source, { from: filePath });
	} catch (error) {
		return [{ filePath, line: error.line ?? 1, message: `CSS parse error: ${error.reason ?? error.message}` }];
	}

	const issues = [];
	root.walk((container) => {
		const declarations = container.nodes?.filter((node) => node.type === 'decl') ?? [];
		let highestRank = -1;
		let highestRankDeclaration;
		const seenUnprefixed = new Set();

		for (const declaration of declarations) {
			const property = declaration.prop.toLowerCase();
			if (property.startsWith('--')) continue;

			const prefixed = vendorPrefixPattern.test(property);
			const normalizedProperty = prefixed ? property.replace(vendorPrefixPattern, '') : property;
			if (!propertyRanks.has(normalizedProperty)) {
				if (!prefixed) {
					issues.push({ filePath, line: declaration.source?.start?.line ?? 1, message: `Unclassified CSS property "${property}"; add it to the Recess ordering baseline or explicitly classify it.` });
				}
				continue;
			}

			const rank = propertyRanks.get(normalizedProperty);
			if (rank < highestRank) {
				issues.push({ filePath, line: declaration.source?.start?.line ?? 1, message: `CSS property "${property}" is out of order after "${highestRankDeclaration.prop}".` });
			} else if (rank > highestRank) {
				highestRank = rank;
				highestRankDeclaration = declaration;
			}

			if (prefixed && seenUnprefixed.has(normalizedProperty)) {
				issues.push({ filePath, line: declaration.source?.start?.line ?? 1, message: `Prefixed property "${property}" must precede its unprefixed form.` });
			} else if (!prefixed) {
				seenUnprefixed.add(normalizedProperty);
			}
		}
	});

	return issues;
}

function collectCssFiles(directory) {
	return readdirSync(directory, { withFileTypes: true })
		.flatMap((entry) => {
			const path = join(directory, entry.name);
			return entry.isDirectory() ? collectCssFiles(path) : entry.isFile() && path.endsWith('.css') ? [path] : [];
		})
		.sort();
}

export function run(root = process.cwd()) {
	const files = collectCssFiles(join(root, 'src'));
	const issues = files.flatMap((path) => findCssPropertyOrderIssues(readFileSync(path, 'utf8'), relative(root, path).replaceAll('\\', '/')));
	if (issues.length) {
		for (const issue of issues) console.error(`${issue.filePath}:${issue.line}: ${issue.message}`);
		return 1;
	}
	console.log(`CSS Recess property order passed for ${files.length} stylesheets.`);
	return 0;
}

const currentFile = fileURLToPath(import.meta.url).toLowerCase();
const invokedFile = process.argv[1] ? resolve(process.argv[1]).toLowerCase() : '';
if (currentFile === invokedFile) process.exitCode = run();
