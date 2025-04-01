import { spawn } from "node:child_process";
import { homedir } from "node:os";
import { basename, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { CONFIG_PATH, FACTORY_REPO } from "../constants.mjs";
import { walkFileTree } from "./fs-tree.mjs";
import { logger } from "./logging.mjs";

/**
 * @typedef {object} RepositoryInfo
 * @property {string} path - The path to the repository root.
 * @property {string} main - The name of the main branch (e.g. master).
 */

/**
 * Synchronizes the repository with the latest remote version. Does nothing if
 * there are any local changes, or the repository is checked out to a different
 * branch.
 * @param {RepositoryInfo} [repository] - The repository to synchronize.
 * @returns {Promise<void>}
 */
export async function syncWithRemote(repository = FACTORY_REPO) {
	try {
		const currentBranch = await execGit(repository, "git rev-parse --abbrev-ref HEAD");
		if (currentBranch !== repository.main) {
			logger.warn(`Parent repository of '${repository.path}' is not on the main branch '${repository.main}'; Update skipped.`);
			return;
		}

		const localChangesList = await execGit(repository, "git status --porcelain");
		if (localChangesList !== "") {
			logger.warn(`Parent repository of '${repository.path}' contains uncommitted changes; Update skipped.`);
			return;
		}

		await execGit(repository, "git pull");
	}
	catch (ex) {
		logger.warn(`Failed to synchronize repository ${repository.path}: ${ex.message}`);
	}
}

/**
 * Attempts to detect the latest tagged version of a repository.
 * @param {RepositoryInfo} [repository] - The repository to check.
 * @returns {Promise<string>} The detected version.
 */
export async function getVersion(repository = FACTORY_REPO) {
	try {
		const tags = await execGit(repository, `git tag --sort=version:refname --merged=${repository.main}`);
		const lastLine = tags.lastIndexOf("\n") + 1;
		return tags.slice(lastLine);
	}
	catch {
		return "unknown";
	}
}

/**
 * Attempts to list all known templates within a repository.
 * @param {RepositoryInfo} [repository] - The repository to check.
 * @returns {Promise<string[]>} A list of absolute paths to detected templates.
 */
export async function listKnownTemplates(options) {
	let repositories = [ FACTORY_REPO ];
	try {
		const url = pathToFileURL(CONFIG_PATH).href;
		const { default: config } = await import(url);
		if (Array.isArray(config)) {
			repositories = repositories.concat(config);
		}
	}
	catch {
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
				if (!name.startsWith(".")) {
					list.push(dirPath);
				}

				// do not recurse into deeper dirs
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

function exec(commandOrVerbs, cwd = "") {
	return new Promise((execResolve, execReject) => {
		const verbs = typeof commandOrVerbs === "string"
			? commandOrVerbs.split(/\s+/)
			: commandOrVerbs;

		const proc = spawn(verbs[0], verbs.slice(1), {
			cwd: resolve(process.cwd(), cwd),
			stdio: [ "ignore", "pipe", "ignore" ]
		});

		const outputChunks = [];
		proc.stdout.on("data", chunk => {
			outputChunks.push(chunk);
		});

		proc.on("error", execReject);
		proc.on("exit", code => {
			if (code === 0) {
				const output = Buffer.concat(outputChunks).toString("utf8");
				execResolve(output);
			}
			else {
				execReject(new Error(`Process exited with non-zero code ${code}.`));
			}
		});
	});
}

function expandTilde(path) {
	return path.startsWith("~")
		? join(homedir(), path.slice(1))
		: path;
}
