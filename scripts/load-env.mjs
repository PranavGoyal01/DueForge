import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

function parseEnvLine(line) {
	const trimmed = line.trim();
	if (!trimmed || trimmed.startsWith("#")) {
		return null;
	}

	const equalsIndex = trimmed.indexOf("=");
	if (equalsIndex <= 0) {
		return null;
	}

	const key = trimmed.slice(0, equalsIndex).trim();
	let value = trimmed.slice(equalsIndex + 1).trim();

	if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
		value = value.slice(1, -1);
	}

	return { key, value };
}

function loadFile(filePath, override = false) {
	if (!existsSync(filePath)) {
		return;
	}

	const source = readFileSync(filePath, "utf8");
	for (const line of source.split(/\r?\n/)) {
		const parsed = parseEnvLine(line);
		if (!parsed) {
			continue;
		}

		if (override || process.env[parsed.key] === undefined) {
			process.env[parsed.key] = parsed.value;
		}
	}
}

export function loadLocalEnv() {
	const cwd = process.cwd();
	loadFile(resolve(cwd, ".env"));
	loadFile(resolve(cwd, ".env.local"), true);
}
