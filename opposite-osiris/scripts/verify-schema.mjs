#!/usr/bin/env node
import { assertBaasConfig, baasHeaders, fail, pass } from './baas-env.mjs';

const expectedColumns = ['id', 'username', 'email'];

try {
	const { url } = assertBaasConfig();
	const select = expectedColumns.join(',');
	const response = await fetch(`${url}/rest/v1/users?select=${select}&limit=0`, {
		headers: baasHeaders({ Prefer: 'count=exact' }),
	});

	if (!response.ok) {
		const body = await response.text();
		throw new Error(`users schema check failed with ${response.status} ${response.statusText}: ${body}`);
	}

	const sensitiveResponse = await fetch(`${url}/rest/v1/users?select=password_hash&limit=1`, {
		headers: baasHeaders(),
	});

	if (sensitiveResponse.ok) {
		const body = await sensitiveResponse.text();
		if (body !== '[]') {
			throw new Error('password_hash is exposed to the anonymous role.');
		}
	}

	pass(`users table is reachable and exposes expected columns: ${expectedColumns.join(', ')}.`);
} catch (error) {
	fail('BaaS schema verification failed.', error);
}
