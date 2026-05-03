#!/usr/bin/env node
import { assertBaasConfig, baasHeaders, fail, pass } from './baas-env.mjs';

try {
	const { url } = assertBaasConfig();
	const response = await fetch(`${url}/rest/v1/`, {
		headers: baasHeaders(),
	});

	if (!response.ok) {
		throw new Error(`Expected 200 from PostgREST root, received ${response.status} ${response.statusText}`);
	}

	pass('BaaS PostgREST gateway responded with HTTP 200.');
} catch (error) {
	fail('BaaS connection verification failed.', error);
}
