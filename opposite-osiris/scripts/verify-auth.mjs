#!/usr/bin/env node
import { assertBaasConfig, fail, pass } from './baas-env.mjs';

try {
	const { url, anonKey } = assertBaasConfig();
	const response = await fetch(`${url}/auth/v1/token?grant_type=password`, {
		method: 'POST',
		headers: {
			apikey: anonKey,
			'Content-Type': 'application/json',
			Accept: 'application/json',
		},
		body: JSON.stringify({
			email: 'john.doe@example.com',
			password: 'Test123!',
		}),
	});

	const payload = await response.json().catch(() => ({}));
	if (!response.ok || typeof payload.access_token !== 'string' || payload.access_token.length === 0) {
		throw new Error(`password grant failed with ${response.status} ${response.statusText}`);
	}

	pass('GoTrue password grant returned a valid access_token.');
} catch (error) {
	fail('BaaS auth verification failed.', error);
}
