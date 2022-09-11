import { format, logger } from '../core/logging.mjs';
import { getVersion } from '../core/repository.mjs';

export default {
	description: 'Prints the CLI version.',
	async exec() {
		const version = await getVersion();
		logger.log(`Shapes version: ${format.bold(version)}`);
	}
};
