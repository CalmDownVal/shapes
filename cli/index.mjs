import { commands, options } from './commands/index.mjs';
import { mapArgs, parseOptions } from './core/cli.mjs';
import { logger } from './core/logging.mjs';

export async function main(args = process.argv.slice(2)) {
	try {
		const cli = parseOptions(options, args);
		const command = commands[cli.args[0]] ?? commands.help;

		await command.exec({
			args: mapArgs(command.args ?? [], cli.args.slice(1)),
			options: cli.options
		});
	}
	catch (ex) {
		logger.error(ex.message);
	}
}
