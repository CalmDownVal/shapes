import { logger } from "../core/logging.mjs";
import { CONFIG_PATH } from "../constants.mjs";

export default {
	description: "Prints the absolute path to the current shapes config file.",
	exec() {
		logger.log(CONFIG_PATH);
	},
};
