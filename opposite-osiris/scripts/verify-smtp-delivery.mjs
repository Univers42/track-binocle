#!/usr/bin/env node
import assert from 'node:assert/strict';
import { assertBaasConfig } from './baas-env.mjs';

const { url, anonKey } = assertBaasConfig();
const email = 'dev.pro.photo@gmail.com';

async function requestRecovery(attempt) {
	const response = await fetch(`${url}/auth/v1/recover`, {
		method: 'POST',
		headers: {
			apikey: anonKey,
			Accept: 'application/json',
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({ email }),
	});
	const body = await response.text().catch(() => '');
	assert.equal(response.status, 200, `attempt ${attempt} returned HTTP ${response.status}: ${body}`);
	console.log(`PASS Recovery request ${attempt} accepted.`);
}

await requestRecovery(1);
console.log('✓ Recovery email dispatched. Please manually verify delivery to dev.pro.photo@gmail.com within 2 minutes.');
await new Promise((resolve) => setTimeout(resolve, 10_000));
await requestRecovery(2);
