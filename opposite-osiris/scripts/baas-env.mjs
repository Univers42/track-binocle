import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const envFiles = ['.env.local', '.env'];

function stripWrappingQuotes(value) {
	const first = value.at(0);
	const last = value.at(-1);
	return (first === last && (first === '"' || first === "'")) ? value.slice(1, -1) : value;
}

function safeLogMessage(message) {
	return String(message).replaceAll(/[\r\n\t]/g, ' ').slice(0, 240);
}

for (const file of envFiles) {
	const path = resolve(process.cwd(), file);
	if (!existsSync(path)) {
		continue;
	}

	const content = readFileSync(path, 'utf8');
	for (const rawLine of content.split(/\r?\n/)) {
		const line = rawLine.trim();
		if (!line || line.startsWith('#') || !line.includes('=')) {
			continue;
		}
		const [key, ...valueParts] = line.split('=');
		const value = stripWrappingQuotes(valueParts.join('=').trim());
		if (key && process.env[key] === undefined) {
			process.env[key] = value;
		}
	}
}

export const baasConfig = {
	url: (process.env.PUBLIC_BAAS_URL ?? 'http://localhost:8000').replaceAll(/\/$/g, ''),
	anonKey: process.env.PUBLIC_BAAS_ANON_KEY ?? '',
};

export function assertBaasConfig() {
	if (!baasConfig.url || !baasConfig.anonKey) {
		throw new Error('Missing PUBLIC_BAAS_URL or PUBLIC_BAAS_ANON_KEY. Set them in opposite-osiris/.env.local.');
	}
	return baasConfig;
}

export function baasHeaders(extra = {}) {
	const { anonKey } = assertBaasConfig();
	return {
		apikey: anonKey,
		Authorization: `Bearer ${anonKey}`,
		Accept: 'application/json',
		...extra,
	};
}

export function pass(message) {
	console.log(`PASS ${safeLogMessage(message)}`);
	process.exit(0);
}

export function fail(message, error) {
	const detail = error instanceof Error ? ` ${error.message}` : '';
	console.error(`FAIL ${safeLogMessage(message)}${safeLogMessage(detail)}`);
	process.exit(1);
}
