import { EOL } from "node:os";

function error(message = "") {
	log(color.red(`${bold("Error")}: ${message}`));
}

function warn(message = "") {
	log(color.yellow(`${bold("Warning")}: ${message}`));
}

function log(message = "") {
	process.stdout.write(message + EOL);
}

export const logger = Object.freeze({
	error,
	log,
	warn,
});


function color(message, rgb) {
	return `\u001b[38;2;${(rgb >> 16) & 0xff};${(rgb >> 8) & 0xff};${rgb & 0xff}m${message}\u001b[39m`;
}

color.red = message => color(message, 0xea4c41);
color.yellow = message => color(message, 0xead141);
color.green = message => color(message, 0x41ea62);
color.blue = message => color(message, 0x41afea);
color.gray = message => color(message, 0x808080);

function bold(message) {
	return `\u001b[1m${message}\u001b[22m`;
}

function underline(message) {
	return `\u001b[4m${message}\u001b[24m`;
}

export const format = Object.freeze({
	color,
	bold,
	underline,
});
