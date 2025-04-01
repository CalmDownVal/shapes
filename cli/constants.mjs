import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const CONFIG_PATH = join(REPO_ROOT, './shapes-config.mjs');

// Info for this very repository.
export const FACTORY_REPO = {
	path: join(REPO_ROOT, './templates'),
	main: 'master'
};

// the extension used to indicate template files
export const TEMPLATE_FILE_EXT = '.template';
