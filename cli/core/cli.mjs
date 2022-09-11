import { createInterface } from 'node:readline';

const RE_OPTION = /^-([a-z0-9]+)|--([a-z0-9]+(?:-[a-z0-9]+)*)(?:=(.*))?$/i;

/*
interface OptionDefinition {
	long?: string[];
	short?: string[];

	// By default options are boolean flags (set / not set) and are not required.
	// When enabled, options will *require* a (string) value.
	hasValue?: boolean;

	// Only has effect for options with `hasValue` enabled.
	// When set, options will become optional.
	defaultValue?: string;
}
*/

export function parseOptions(optionDefs, args) {
	const result = {
		args: args.slice(),
		options: {}
	};

	const requiredKeys = [];
	const optionMap = {};
	const getOption = (key) => {
		const option = optionMap[key];
		if (!option) {
			throw new Error(`Unrecognized option: ${key}`);
		}

		return option;
	};

	for (const key in optionDefs) {
		const definition = {
			...optionDefs[key],
			key
		};

		// Map all aliases of the current option.
		for (const alias of definition.long ?? []) {
			if (alias.length === 0) {
				throw new Error('Command alias must not be an empty string.');
			}

			if (optionMap[alias]) {
				throw new Error(`Alias --${alias} is used by multiple options.`);
			}

			optionMap[`--${alias}`] = definition;
		}

		for (const alias of definition.short ?? []) {
			if (alias.length !== 1) {
				throw new Error(`Invalid short alias '${alias}'. Short aliases must be exactly one character long.`);
			}

			if (optionMap[alias]) {
				throw new Error(`Alias -${alias} is used by multiple options.`);
			}

			optionMap[`-${alias}`] = definition;
		}

		// Prepare default values and keep track of required options.
		if (definition.hasValue) {
			if (definition.defaultValue === undefined) {
				requiredKeys.push(key);
			}
			else {
				result.options[key] = definition.defaultValue;
			}
		}
		else {
			result.options[key] = false;
		}
	}

	let i = 0;
	while (i < result.args.length) {
		if (result.args[i] === '--') {
			break;
		}

		const match = RE_OPTION.exec(result.args[i]);
		if (!match) {
			++i;
			continue;
		}

		let size = 1;
		if (match[1]) {
			const count = match[1].length;
			if (count === 1) {
				// Single short option, e.g.: -x
				const option = getOption(`-${match[1]}`);

				if (option.hasValue) {
					result.options[option.key] = result.args[i + 1];
					size = 2;
				}
				else {
					result.options[option.key] = true;
				}
			}
			else {
				// Multiple short options, e.g.: -xyz
				for (let j = 0; j < match[1].length; ++j) {
					const option = getOption(`-${match[1][j]}`);
					if (option.hasValue) {
						throw new Error(`Option -${match[1][j]} requires a value.`);
					}

					result.options[option.key] = true;
				}
			}
		}
		else {
			const option = getOption(`--${match[2]}`);
			if (option.hasValue) {
				if (match[3] === undefined) {
					result.options[option.key] = result.args[i + 1];
					size = 2;
				}
				else {
					result.options[option.key] = match[3];
				}
			}
			else {
				if (match[3] !== undefined) {
					throw new Error(`Option --${match[2]} does not accept a value.`);
				}

				result.options[option.key] = true;
			}
		}

		result.args.splice(i, size);
	}

	// check for missing required options
	for (const key of requiredKeys) {
		if (result.options[key] === undefined) {
			const definition = optionDefs[key];
			throw new Error(`Missing required option ${definition.long[0] ? `--${definition.long[0]}` : `-${definition.short[0]}`}`);
		}
	}

	return result;
}

/*
interface ArgumentDefinition {
	name: string;
	isOptional?: boolean;
}
*/

export function mapArgs(argDefs, args) {
	if (argDefs.length < args.length) {
		throw new Error('Too many arguments.');
	}

	const count = Math.min(argDefs.length, args.length);
	const argMap = {};

	let i = 0;
	while (i < count) {
		const definition = argDefs[i];
		// if (!definition.isOptional && i !== 0 && argDefs[i - 1].isOptional) {
		// 	throw new Error('Required arguments must not be preceded by optional arguments.');
		// }

		argMap[definition.name] = args[i];
		++i;
	}

	if (i < argDefs.length && !argDefs[i].isOptional) {
		throw new Error(`Missing required argument: <${argDefs[i].name}>`);
	}

	return argMap;
}

export function ask(prompt, validator) {
	return new Promise(resolve => {
		const rl = createInterface({
			input: process.stdin,
			output: process.stdout
		});

		rl.on('line', input => {
			if (validator?.(input) === false) {
				process.stdout.write(prompt);
				return;
			}

			rl.close();
			resolve(input);
		});

		process.stdout.write(prompt);
	});
}

export function askYesNo(prompt) {
	return ask(`${prompt} [y/n]: `, answer => /^[yn]$/i.test(answer)).then(answer => /^[yY]$/.test(answer));
}
