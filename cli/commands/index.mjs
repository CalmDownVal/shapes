import ConfigCommand from './config.mjs';
import ListCommand from './list.mjs';
import MkDirCommand from './mkdir.mjs';
import UpdateCommand from './update.mjs';
import VersionCommand from './version.mjs';

import { format, logger } from '../core/logging.mjs';

export const commands = {
	config: ConfigCommand,
	list: ListCommand,
	mkdir: MkDirCommand,
	update: UpdateCommand,
	version: VersionCommand,
	help: {
		description: 'Show help.',
		exec() {
			logger.log(format.underline('General Usage:'));
			logger.log(format.bold('shapes [<options>] <command> [<args>]'));
			logger.log();

			logger.log(format.underline('Commands:'));
			for (const name in commands) {
				const command = commands[name];

				let args = '';
				for (const arg of command.args ?? []) {
					args += arg.isOptional ? ` [${arg.name}]` : ` <${arg.name}>`;
				}

				logger.log(`∙ ${format.bold(`shapes [<options>] ${name}${args}`)}`);
				logger.log(`  ${command.description}\n`);
			}

			logger.log(format.underline('Options:'));
			for (const key in options) {
				const option = options[key];

				let aliases = '';
				for (const alias of option.short ?? []) {
					aliases += `${aliases ? ', ' : ''}-${alias}`;
				}

				for (const alias of option.long ?? []) {
					aliases += `${aliases ? ', ' : ''}--${alias}`;
				}

				logger.log(`∙ ${format.bold(aliases)}`);
				logger.log(`  ${option.description}\n`);
			}
		}
	}
};

const sharedOptions = {
	gitDisabled: {
		long: [ 'no-git' ],
		short: [ 'g' ],
		description: 'Disable Git operations (pull).'
	}
};

export const options = Object.values(commands).reduce(
	(map, cmd) => ({ ...map, ...cmd.options }),
	sharedOptions
);
