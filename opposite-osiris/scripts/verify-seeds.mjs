#!/usr/bin/env node
import { assertBaasConfig, baasHeaders, fail, pass } from './baas-env.mjs';

const expectedEmails = new Set([
	'john.doe@example.com',
	'jane.doe@example.com',
	'alice@example.com',
	'bob@example.com',
	'charlie@example.com',
	'diana@example.com',
	'evan@example.com',
	'fiona@example.com',
	'george@example.com',
	'hannah@example.com',
]);

try {
	const { url } = assertBaasConfig();
	const response = await fetch(`${url}/rest/v1/users?select=email&limit=10`, {
		headers: baasHeaders(),
	});

	if (!response.ok) {
		const body = await response.text();
		throw new Error(`seed query failed with ${response.status} ${response.statusText}: ${body}`);
	}

	const rows = await response.json();
	const actualEmails = new Set(Array.isArray(rows) ? rows.map((row) => row.email) : []);
	const missing = [...expectedEmails].filter((email) => !actualEmails.has(email));

	if (missing.length > 0) {
		throw new Error(`Missing seeded emails: ${missing.join(', ')}`);
	}

	pass('All 10 seeded users are present through PostgREST.');
} catch (error) {
	fail('BaaS seed verification failed.', error);
}
