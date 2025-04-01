import { readFile, realpath, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

import { TEMPLATE_FILE_EXT } from '../constants.mjs';
import { ask } from './cli.mjs';
import { format } from './logging.mjs';

/**
 * Checks whether a file path is considered a template.
 * @param {string} path - The file path to check.
 * @returns {boolean}
 */
export function isTemplate(path) {
	return path.endsWith(TEMPLATE_FILE_EXT);
}

/**
 * Removes the template extension from a template file path, or does nothing if
 * the path is not a template.
 * @param {string} path - The file path to modify.
 * @returns {string}
 */
export function removeTemplateExtension(path) {
	return isTemplate(path) ? path.slice(0, -TEMPLATE_FILE_EXT.length) : path;
}

/**
 * Expands a template resolving any placeholders.
 * @param {string} srcPath - The template file path.
 * @param {string} dstPath - The destination file path.
 * @returns {Promise<void>}
 */
export async function expandTemplate(srcPath, dstPath) {
	const result = await expandTemplateAsString(GLOBAL_CONTEXT, srcPath);
	await writeFile(dstPath, result);
}

/**
 * @typedef {object} DSLContext
 * @property {object.<string, string>} askVars - Prompted user inputs.
 * @property {object.<string, string>} envVars - Environment variables.
 * @property {string} templatePath - Path to the template file being expanded.
 */

const RE_START = /<%/g;
const RE_END = /%>/g;
const GLOBAL_CONTEXT = {
	askVars: {},
	envVars: { ...process.env },
	templatePath: ''
};

const DSL = {
	async ask(context, varName, defaultValue) {
		if (Object.prototype.hasOwnProperty.call(context.askVars, varName)) {
			return context.askVars[varName];
		}

		let prompt = `Asking for ${format.bold(varName)}`;
		if (defaultValue) {
			prompt += ` [${defaultValue}]`;
		}

		const value = await ask(`${prompt}: `);
		return (context.askVars[varName] = value || defaultValue);
	},
	env(context, varName, defaultValue) {
		if (Object.prototype.hasOwnProperty.call(context.envVars, varName)) {
			return context.envVars[varName];
		}

		if (defaultValue === undefined) {
			throw new Error(`Required environment variable ${varName} was not set.`);
		}

		return defaultValue;
	},
	ext(context, importPath) {
		const resolvedPath = join(dirname(context.templatePath), importPath);
		return expandTemplateAsString(context, resolvedPath);
	}
};

async function expandTemplateAsString(parentContext, path) {
	// Since templates can be linked and contain relative import paths at the
	// same time we must get the actual path of the file to resolve correctly.
	const templatePath = await realpath(path);

	// Templates are very unlikely to be larger than a few kB, so we can cram it
	// all into a string without losing much sleep about it.
	const template = await readFile(templatePath, 'utf8');
	if (!isTemplate(path)) {
		return template;
	}

	const context = {
		...parentContext,
		templatePath
	};

	let anchor = 0;
	let result = '';

	while (true) {
		// find a starting tag
		RE_START.lastIndex = anchor;
		const startMatch = RE_START.exec(template);
		if (!startMatch) {
			break;
		}

		// find its closing tag
		RE_END.lastIndex = startMatch.index + startMatch[0].length;
		const endMatch = RE_END.exec(template);
		if (!endMatch) {
			throw new Error('Expected a closing tag %>');
		}

		// expand the macro & append contents
		const js = template.slice(startMatch.index + startMatch[0].length, endMatch.index);
		result += template.slice(anchor, startMatch.index) + await expandMacro(context, js);
		anchor = endMatch.index + endMatch[0].length;
	}

	return result + template.slice(anchor);
}

function expandMacro(context, js) {
	// the ugly and dangerous...
	const keys = Object.keys(DSL);
	return (new Function(...keys, `return ${js};`)).apply(null, keys.map(key => DSL[key].bind(null, context)));
}
