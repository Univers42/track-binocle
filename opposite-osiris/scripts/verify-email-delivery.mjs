#!/usr/bin/env node
import assert from 'node:assert/strict';

const baasUrl = (process.env.PUBLIC_BAAS_URL ?? 'http://localhost:8000').replace(/\/$/, '');
const anonKey = process.env.PUBLIC_BAAS_ANON_KEY ?? '';
const recoveryEmail = process.env.EMAIL_DELIVERY_TEST_ADDRESS ?? 'john.doe@example.com';

async function main() {
	assert.ok(baasUrl, 'PUBLIC_BAAS_URL is required.');
	assert.ok(anonKey, 'PUBLIC_BAAS_ANON_KEY is required.');

	const response = await fetch(`${baasUrl}/auth/v1/recover`, {
		method: 'POST',
		headers: {
			apikey: anonKey,
			Accept: 'application/json',
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({ email: recoveryEmail }),
	});

	const body = await response.text().catch(() => '');
	assert.equal(response.status, 200, `GoTrue recover returned HTTP ${response.status}: ${body}`);
	console.log(`PASS GoTrue accepted a password recovery email request for ${recoveryEmail}.`);
	console.log('Manual delivery check required: verify the SMTP test inbox dev.pro.photo@gmail.com and the target recovery inbox according to the test account routing.');
}

main().catch((error) => {
	console.error(error instanceof Error ? error.message : String(error));
	process.exitCode = 1;
});
