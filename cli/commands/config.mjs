import { logger } from '../core/logging.mjs';
import { CONFIG_PATH } from '../constants.mjs';

export default {
	description: 'Prints absolute path to the config file.',
	exec() {
		logger.log(CONFIG_PATH);
	}
};
