#!/usr/bin/env node

const target = process.argv.find((arg) => arg.startsWith('http')) ?? process.env.CSP_VERIFY_URL ?? 'https://localhost:4322/';
const allowLocalTls = target.startsWith('https://localhost') || target.startsWith('https://127.0.0.1');

if (allowLocalTls) {
	process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

function extractMetaCsp(html) {
	const match = html.match(/<meta\s+[^>]*http-equiv=["']Content-Security-Policy["'][^>]*content=(["'])(.*?)\1[^>]*>/i)
		?? html.match(/<meta\s+[^>]*content=(["'])(.*?)\1[^>]*http-equiv=["']Content-Security-Policy["'][^>]*>/i);
	return match?.[2]?.replaceAll('&quot;', '"').replaceAll('&#39;', "'") ?? '';
}

function extractMetaMode(html) {
	const match = html.match(/<meta\s+[^>]*name=["']prismatica-csp-mode["'][^>]*content=(["'])(.*?)\1[^>]*>/i)
		?? html.match(/<meta\s+[^>]*content=(["'])(.*?)\1[^>]*name=["']prismatica-csp-mode["'][^>]*>/i);
	return match?.[2] ?? '';
}

function fail(message) {
	console.error(`FAIL ${message}`);
	process.exitCode = 1;
}

const response = await fetch(target, { redirect: 'manual' });
const html = await response.text();
const headerCsp = response.headers.get('content-security-policy') ?? '';
const metaCsp = extractMetaCsp(html);
const csp = headerCsp || metaCsp;
const mode = response.headers.get('x-prismatica-csp-mode') ?? extractMetaMode(html) ?? (headerCsp ? 'unknown' : 'production-meta');

if (csp) {
	console.log(`PASS CSP found via ${headerCsp ? 'header' : 'meta'} (${mode}).`);
} else {
	fail('Content-Security-Policy was not found in a response header or meta tag.');
}

for (const directive of ['default-src', 'script-src', 'connect-src', 'object-src', 'base-uri']) {
	if (!new RegExp(String.raw`(^|;)\s*${directive}\b`).test(csp)) {
		fail(`Missing ${directive} directive.`);
	}
}

if (/script-src[^;]*'unsafe-eval'/.test(csp)) {
	if (mode === 'development') {
		console.log('PASS unsafe-eval is limited to the development Vite/HMR CSP header.');
	} else {
		fail('Production CSP must not include unsafe-eval.');
	}
} else {
	console.log('PASS CSP does not allow unsafe-eval.');
}

if (/eval\(|new Function\(|set(?:Timeout|Interval)\(\s*['"`]/.test(html)) {
	fail('Served HTML contains eval-like script text.');
} else {
	console.log('PASS served HTML has no eval-like script text.');
}
