import { copyFile, mkdir } from 'node:fs/promises';
import { basename, relative, resolve, sep as DIR_SEPARATOR } from 'node:path';

import { askYesNo } from '../core/cli.mjs';
import { getFileTree, walkFileTree } from '../core/fs-tree.mjs';
import { format, logger } from '../core/logging.mjs';
import { listKnownTemplates } from '../core/repository.mjs';
import { expandTemplate, isTemplate, removeTemplateExtension } from '../core/template.mjs';

export default {
	description: 'Setup a new directory using a template.',
	args: [
		{ name: 'template' },
		{ name: 'dirname' }
	],
	options: {
		previewDisabled: {
			long: [ 'no-preview' ],
			short: [ 'p' ],
			description: 'Run immediately without preview.'
		}
	},
	async exec({ options, args }) {
		const targetDirPath = resolve(args.dirname);

		// find the template
		let templateDirPath;
		if (args.template.includes(DIR_SEPARATOR)) {
			templateDirPath = resolve(args.template);
		}
		else {
			const templates = await listKnownTemplates(options);
			const searchLc = args.template.toLowerCase();
			const template = templates.find(tmp => tmp.toLowerCase().endsWith(searchLc));
			if (!template) {
				throw new Error(`Template '${args.template}' not found. Use 'shapes list' for a list of available templates.`);
			}

			templateDirPath = template;
		}

		// preview / dry run
		if (!options.previewDisabled) {
			logger.log(format.underline('Result Preview:'));
			logger.log();

			const tree = await getFileTree(templateDirPath);
			tree.path = targetDirPath;
			prettyPrintEntry(tree);

			logger.log();
			if (!await askYesNo('Do you wish to continue?')) {
				return;
			}
		}

		// actual FS things happen here
		await mkdir(targetDirPath);
		await walkFileTree(templateDirPath, {
			async preVisitDirectory(srcDirPath) {
				const dstDirPath = resolve(targetDirPath, relative(templateDirPath, srcDirPath));
				await mkdir(dstDirPath);
			},
			async visitFile(srcFilePath) {
				const dstFilePath = resolve(targetDirPath, relative(templateDirPath, srcFilePath));
				if (isTemplate(dstFilePath)) {
					await expandTemplate(srcFilePath, removeTemplateExtension(dstFilePath));
				}
				else {
					await copyFile(srcFilePath, dstFilePath);
				}
			}
		});

		logger.log();
		logger.log(format.color.green('Finished!'));
	}
};

function prettyPrintEntry(entry, prefix = '') {
	const isLastEntry = entry.parent
		? entry.parent.entries[entry.parent.entries.length - 1] === entry
		: true;

	let name = entry.parent ? basename(entry.path) : entry.path;
	if (!entry.isDirectory) {
		name = isTemplate(name)
			? format.color.green(removeTemplateExtension(name))
			: format.color.blue(name);
	}

	logger.log(format.color.gray(prefix + (isLastEntry ? '└── ' : '├── ')) + format.bold(name));
	if (entry.isDirectory) {
		for (const childEntry of entry.entries) {
			prettyPrintEntry(childEntry, prefix + (isLastEntry ? '    ' : '│   '));
		}
	}
}
