import { spawn } from 'node:child_process';
import { homedir } from 'node:os';
import { basename, join, resolve } from 'node:path';

import { FACTORY_REPO } from '../constants.mjs';
import { walkFileTree } from './fs-tree.mjs';
import { logger } from './logging.mjs';

/*
interface RepositoryInfo {
	path: string;
	main: string;
}
*/

export async function syncWithRemote(repository = FACTORY_REPO) {
	try {
		const currentBranch = await execGit(repository, 'git rev-parse --abbrev-ref HEAD');
		if (currentBranch !== repository.main) {
			logger.warn(`Repository '${repository.path}' is not on the main branch '${repository.main}'; Update skipped.`);
			return;
		}

		await execGit(repository, 'git pull');
	}
	catch (ex) {
		logger.warn(`Failed to synchronize repository ${repository.path}: ${ex.message}`);
	}
}

export async function getVersion(repository = FACTORY_REPO) {
	try {
		const tags = await execGit(repository, `git tag --sort=version:refname --merged=${repository.main}`);
		const lastLine = Math.max(tags.lastIndexOf('\n'), 0);
		return tags.slice(lastLine);
	}
	catch (_ex) {
		return 'unknown';
	}
}

export async function listKnownTemplates(options) {
	let repositories = [ FACTORY_REPO ];
	try {
		const { default: config } = await import('../../shapes-config.mjs');
		if (Array.isArray(config)) {
			repositories = repositories.concat(config);
		}
	}
	catch (_ex) {
		// config likely missing
	}

	if (!options.gitDisabled) {
		for (const repository of repositories) {
			await syncWithRemote(repository);
		}
	}

	const list = [];
	for (const repository of repositories) {
		await walkFileTree(expandTilde(repository.path), {
			preVisitDirectory(dirPath) {
				const name = basename(dirPath);
				if (!name.startsWith('.')) {
					list.push(dirPath);
				}

				return false;
			}
		});
	}

	return list;
}

async function execGit(repository, command) {
	const gitOutput = await exec(command, expandTilde(repository.path));
	return gitOutput.trim();
}

function exec(commandOrVerbs, cwd = '') {
	return new Promise((execResolve, execReject) => {
		const verbs = typeof commandOrVerbs === 'string'
			? commandOrVerbs.split(/\s+/)
			: commandOrVerbs;

		const proc = spawn(verbs[0], verbs.slice(1), {
			cwd: resolve(process.cwd(), cwd),
			stdio: [ 'ignore', 'pipe', 'ignore' ]
		});

		const outputChunks = [];
		proc.stdout.on('data', chunk => {
			outputChunks.push(chunk);
		});

		proc.on('error', execReject);
		proc.on('exit', code => {
			if (code === 0) {
				const output = Buffer.concat(outputChunks).toString('utf8');
				execResolve(output);
			}
			else {
				execReject(new Error(`Process exited with non-zero code ${code}.`));
			}
		});
	});
}

function expandTilde(path) {
	return path.startsWith('~') ? join(homedir(), path.slice(1)) : path;
}
