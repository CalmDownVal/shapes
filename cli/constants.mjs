import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Info for this very repository.
export const FACTORY_REPO = {
	path: resolve(dirname(fileURLToPath(import.meta.url)), '../templates'),
	main: 'master'
};

// the extension used to indicate of template files
export const TEMPLATE_FILE_EXT = '.template';
