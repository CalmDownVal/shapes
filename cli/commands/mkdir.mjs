import { copyFile, mkdir } from "node:fs/promises";
import { basename, join, relative, resolve, sep as SEP } from "node:path";

import { askYesNo } from "../core/cli.mjs";
import { getFileTree, K_DIRECTORY, K_FILE, walkFileTree } from "../core/fs-tree.mjs";
import { format, logger } from "../core/logging.mjs";
import { listKnownTemplates } from "../core/repository.mjs";
import { expandTemplate, isTemplate, removeTemplateExtension } from "../core/template.mjs";

export default {
	description: "Sets up a new directory using a template.",
	args: [
		{ name: "template" },
		{ name: "dirname" },
	],
	options: {
		previewDisabled: {
			long: [ "force" ],
			short: [ "f" ],
			description: "Force run without preview.",
		},
	},
	async exec({ options, args }) {
		const targetDirPath = resolve(args.dirname);

		// find the template
		let templateDirPath;
		if (args.template.includes(SEP)) {
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
			logger.log(format.underline("Result Preview:"));
			logger.log();

			const tree = await getFileTree(templateDirPath);
			tree.path = targetDirPath;
			prettyPrintEntry(tree);

			logger.log();
			if (!await askYesNo("Do you wish to continue?")) {
				return;
			}
		}

		// actual FS things happen here
		await mkdir(targetDirPath, { recursive: true });
		await walkFileTree(templateDirPath, {
			async preVisitDirectory(srcDirPath) {
				if (!filterIgnored(srcDirPath)) {
					return false;
				}

				const dstDirPath = join(targetDirPath, relative(templateDirPath, srcDirPath));
				await mkdir(dstDirPath);
			},
			async visitFile(srcFilePath) {
				if (!filterIgnored(srcFilePath)) {
					return;
				}

				const dstFilePath = join(targetDirPath, relative(templateDirPath, srcFilePath));
				if (isTemplate(dstFilePath)) {
					await expandTemplate(srcFilePath, removeTemplateExtension(dstFilePath));
				}
				else {
					await copyFile(srcFilePath, dstFilePath);
				}
			}
		});

		logger.log();
		logger.log(format.color.green("Finished!"));
	},
};

function prettyPrintEntry(entry, prefix = "") {
	if (!filterIgnored(entry.path)) {
		return;
	}

	const isLastEntry = entry.parent
		? entry.parent.entries[entry.parent.entries.length - 1] === entry
		: true;

	let name = entry.parent ? basename(entry.path) : entry.path;
	switch (entry.kind) {
		case K_FILE:
			name = isTemplate(name)
				? format.color.green(removeTemplateExtension(name))
				: format.color.blue(name);

			break;

		case K_DIRECTORY:
			name += SEP;
			break;
	}

	logger.log(format.color.gray(prefix + (isLastEntry ? "└── " : "├── ")) + format.bold(name));

	if (entry.kind === K_DIRECTORY) {
		for (const childEntry of entry.entries) {
			prettyPrintEntry(childEntry, prefix + (isLastEntry ? "    " : "│   "));
		}
	}
}

// FUTURE: make this configurable?
function filterIgnored(path) {
	const name = basename(path);
	return !(
		name === ".git" ||
		name === ".DS_Store"
	);
}
