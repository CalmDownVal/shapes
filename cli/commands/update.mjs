import { format, logger } from '../core/logging.mjs';
import { getVersion, syncWithRemote } from '../core/repository.mjs';

export default {
	description: 'Updates the CLI to the newest version.',
	async exec() {
		const oldVersion = await getVersion();
		await syncWithRemote();
		const newVersion = await getVersion();

		if (oldVersion === newVersion) {
			logger.log('No updates available.');
		}
		else {
			logger.log(format.color.green(`Updated CLI from ${oldVersion} to ${format.bold(newVersion)}.`));
		}
	}
};
