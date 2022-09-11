import { opendir, readlink, stat } from 'node:fs/promises';
import { join, resolve } from 'node:path';

/*
interface FileVisitor {
	preVisitDirectory?(dirPath: string): Promise<boolean> | boolean;
	postVisitDirectory?(dirPath: string): Promise<void> | void;
	visitFile?(filePath: string): Promise<void> | void;
}
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

export async function getFileTree(rootDirPath) {
	const root = {
		isDirectory: true,
		entries: [],
		parent: null,
		path: rootDirPath
	};

	let currentDirNode = root;
	await walkFileTree(rootDirPath, {
		preVisitDirectory(childDirPath) {
			const childDir = {
				isDirectory: true,
				entries: [],
				parent: currentDirNode,
				path: childDirPath
			};

			currentDirNode.entries.unshift(childDir);
			currentDirNode = childDir;
		},
		postVisitDirectory() {
			currentDirNode = currentDirNode.parent;
		},
		visitFile(filePath) {
			currentDirNode.entries.push({
				isDirectory: false,
				parent: currentDirNode,
				path: filePath
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
		const targetPath = resolve(parentDirPath, linkTarget);
		const targetEntry = await stat(targetPath);
		await visitEntry(parentDirPath, entryPath, targetEntry, visitor);
	}
}
