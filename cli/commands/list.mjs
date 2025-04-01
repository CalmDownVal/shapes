import { basename, dirname, sep as DIR_SEPARATOR } from "node:path";

import { format, logger } from "../core/logging.mjs";
import { listKnownTemplates } from "../core/repository.mjs";

export default {
	description: "Lists available templates.",
	async exec({ options }) {
		const templates = await listKnownTemplates(options);

		let count = 0;
		for (const template of templates) {
			if (++count === 1) {
				logger.log(format.underline("Available Templates"));
			}

			logger.log(`∙ ${format.color.gray(dirname(template) + DIR_SEPARATOR)}${format.bold(basename(template))}`);
		}

		logger.log();
		logger.log(`${format.bold(count)} total`);
	},
};
