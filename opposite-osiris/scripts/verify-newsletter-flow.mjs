#!/usr/bin/env node
import assert from 'node:assert/strict';
import { assertBaasConfig } from './baas-env.mjs';

const { url, anonKey } = assertBaasConfig();

const steps = [];

function record(name, ok, detail = '') {
	steps.push({ Step: name, Result: ok ? 'PASS' : 'FAIL', Detail: detail });
}

function errorMessage(error) {
	return error instanceof Error ? error.message : String(error);
}

async function runStep(name, action, detailText = String) {
	try {
		const detail = await action();
		record(name, true, detailText(detail));
		return detail;
	} catch (error) {
		record(name, false, errorMessage(error));
		return '';
	}
}

async function rpc(name, body, token, method = 'POST') {
	const init = {
		method,
		headers: {
			apikey: anonKey,
			Authorization: `Bearer ${token}`,
			Accept: 'application/json',
			'Content-Type': 'application/json',
		},
	};
	if (method !== 'GET') {
		init.body = JSON.stringify(body);
	}
	return fetch(`${url}/rest/v1/rpc/${name}`, init);
}

async function authenticateSeededUser() {
	const response = await fetch(`${url}/auth/v1/token?grant_type=password`, {
		method: 'POST',
		headers: {
			apikey: anonKey,
			Accept: 'application/json',
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({ email: 'john.doe@example.com', password: 'Test123!' }),
	});
	const payload = await response.json().catch(() => ({}));
	assert.equal(response.ok, true, `HTTP ${response.status}`);
	assert.equal(typeof payload.access_token, 'string');
	return payload.access_token;
}

async function assertRpcOk(name, body, token, method = 'POST') {
	const response = await rpc(name, body, token, method);
	const responseBody = await response.text().catch(() => '');
	assert.equal(response.status, 200, responseBody || `HTTP ${response.status}`);
	return responseBody;
}

async function main() {
	const token = await runStep('Authenticate seeded user', authenticateSeededUser, () => 'JWT returned');

	if (token) {
		await runStep('Grant newsletter consent', async () => {
			await assertRpcOk('gdpr_set_newsletter', { granted: true }, token);
			return 'HTTP 200';
		});
		await runStep('Grant newsletter idempotently', async () => {
			await assertRpcOk('gdpr_set_newsletter', { granted: true }, token);
			return 'HTTP 200';
		});
		await runStep('Withdraw newsletter consent', async () => {
			await assertRpcOk('gdpr_withdraw_consent', { consent_type: 'newsletter' }, token);
			return 'HTTP 200';
		});
		await runStep('Export data includes withdrawal', async () => {
			const body = await assertRpcOk('gdpr_export_my_data', {}, token, 'GET');
			assert.match(body, /newsletter/i);
			assert.match(body, /withdrawn_at/i);
			return 'newsletter withdrawn_at found';
		});
	}

	console.table(steps);
	if (steps.some((step) => step.Result === 'FAIL')) {
		process.exitCode = 1;
	}
}

await main();
