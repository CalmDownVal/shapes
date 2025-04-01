import { opendir, readlink, stat } from "node:fs/promises";
import { join } from "node:path";

/**
 * @callback PreVisitDirectoryCallback
 * @param {string} dirPath - Path to the directory about to be visited.
 * @returns {Promise<boolean> | boolean} Whether the directory should be visited or not.
 */

/**
 * @callback PostVisitDirectoryCallback
 * @param {string} dirPath - Path to the directory that was just visited.
 * @returns {Promise<void> | void}
 */

/**
 * @callback VisitFileCallback
 * @param {string} filePath - Path to the file being visited.
 * @returns {Promise<void> | void}
 */

/**
 * @typedef {object} FileTreeVisitor
 * @param {PreVisitDirectoryCallback} [preVisitDirectory] - A callback to run before visiting a directory.
 * @param {PostVisitDirectoryCallback} [postVisitDirectory] - A callback to run after visiting a directory.
 * @param {VisitFileCallback} [visitFile] - A callback to run when visiting a file.
 * @returns {Promise<void>}
 */

/**
 * Recursively walks a file tree visiting every nested directory and file within it.
 * @param {string} dirPath - Path to the directory where to start walking the tree.
 * @param {FileTreeVisitor} visitor - The visitor callbacks to run.
 * @returns {Promise<void>}
 */
export async function walkFileTree(dirPath, visitor, isFirst = true) {
	if (!isFirst && await visitor.preVisitDirectory?.(dirPath) === false) {
		return;
	}

	for await (const entry of await opendir(dirPath)) {
		await visitEntry(dirPath, join(dirPath, entry.name), entry, visitor);
	}

	await visitor.postVisitDirectory?.(dirPath);
}

/**
 * @typedef {object} FileNode
 * @property {"file"} kind - Indicates the kind of this node: A file.
 * @property {string} path - The absolute path to this file.
 * @property {DirectoryNode} parent - The parent directory node.
 */

/**
 * @typedef {object} DirectoryNode
 * @property {"directory"} kind - Indicates the kind of this node: A directory.
 * @property {string} path - The absolute path to this directory.
 * @property {DirectoryNode | null} parent - The parent directory node, or null if this is the root directory.
 * @property {FileTreeNode[]} entries - The contents of this directory.
 */

/**
 * @typedef {FileNode | DirectoryNode} FileTreeNode
 */

/**
 * Gathers the nested structure of a directory and its contents.
 * @param {string} rootDirPath - Path to the directory to scan.
 * @returns {Promise<FileTreeNode>}
 */
export async function getFileTree(rootDirPath) {
	const root = {
		kind: "directory",
		path: rootDirPath,
		parent: null,
		entries: [],
	};

	let currentDirNode = root;
	await walkFileTree(rootDirPath, {
		preVisitDirectory(childDirPath) {
			const childDir = {
				kind: "directory",
				path: childDirPath,
				parent: currentDirNode,
				entries: [],
			};

			currentDirNode.entries.unshift(childDir);
			currentDirNode = childDir;
		},
		postVisitDirectory() {
			currentDirNode = currentDirNode.parent;
		},
		visitFile(filePath) {
			currentDirNode.entries.push({
				kind: "file",
				path: filePath,
				parent: currentDirNode,
			});
		}
	});

	return root;
}

async function visitEntry(parentDirPath, entryPath, entry, visitor) {
	if (entry.isDirectory()) {
		await walkFileTree(entryPath, visitor, false);
	}
	else if (entry.isFile()) {
		await visitor.visitFile?.(entryPath);
	}
	else if (entry.isSymbolicLink()) {
		const linkTarget = await readlink(entryPath);
		const targetPath = join(parentDirPath, linkTarget);
		const targetEntry = await stat(targetPath);
		await visitEntry(parentDirPath, entryPath, targetEntry, visitor);
	}
}
