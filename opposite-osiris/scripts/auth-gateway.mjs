#!/usr/bin/env node
import { createServer } from 'node:http';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';

for (const file of ['.env.local', '.env', '../infrastructure/baas/mini-baas-infra/.env']) {
	const path = resolve(process.cwd(), file);
	if (!existsSync(path)) continue;
	for (const rawLine of readFileSync(path, 'utf8').split(/\r?\n/)) {
		const line = rawLine.trim();
		if (!line || line.startsWith('#') || !line.includes('=')) continue;
		const [key, ...valueParts] = line.split('=');
		let value = valueParts.join('=').trim();
		if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
		if (key && process.env[key] === undefined) process.env[key] = value;
	}
}

const config = {
	port: Number(process.env.AUTH_GATEWAY_PORT ?? 8787),
	baasUrl: (process.env.PUBLIC_BAAS_URL ?? 'http://localhost:8000').replace(/\/$/, ''),
	anonKey: process.env.PUBLIC_BAAS_ANON_KEY ?? process.env.KONG_PUBLIC_API_KEY ?? '',
	serviceKey: process.env.SERVICE_ROLE_KEY ?? process.env.KONG_SERVICE_API_KEY ?? process.env.PUBLIC_BAAS_ANON_KEY ?? '',
	turnstileSecret: process.env.TURNSTILE_SECRET_KEY ?? '',
	turnstileBypassLocal: process.env.TURNSTILE_BYPASS_LOCAL === 'true',
	siteUrl: process.env.PUBLIC_SITE_URL ?? 'http://localhost:4322',
};

const buckets = new Map();
const EMAIL_ATEXT = "A-Za-z0-9!#$%&'*+/=?^_`{|}~-";
const EMAIL_LOCAL_PART = String.raw`(?:[${EMAIL_ATEXT}]+(?:\.[${EMAIL_ATEXT}]+)*|"[^"\r\n]+")`;
const EMAIL_DOMAIN_LABEL = '(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)';
const EMAIL_REGEX = new RegExp(String.raw`^${EMAIL_LOCAL_PART}@(?:${EMAIL_DOMAIN_LABEL}\.)+[A-Za-z]{2,63}$`);
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
const USERNAME_REGEX = /^\w[\w.-]{2,31}$/;
const THEME_VALUES = new Set(['light', 'dark']);

function clientIp(request) {
	return (request.headers['cf-connecting-ip'] ?? request.headers['x-forwarded-for'] ?? request.socket.remoteAddress ?? 'unknown').toString().split(',')[0].trim();
}

function json(response, status, body, headers = {}) {
	response.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers });
	response.end(JSON.stringify(body));
}

async function readJson(request) {
	let body = '';
	for await (const chunk of request) {
		body += chunk;
		if (body.length > 32_768) throw Object.assign(new Error('Request body too large.'), { status: 413 });
	}
	return body ? JSON.parse(body) : {};
}

function cookieValue(request, name) {
	const cookie = request.headers.cookie ?? '';
	return cookie.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${name}=`))?.slice(name.length + 1) ?? '';
}

function refreshCookie(token, maxAge = 60 * 60 * 24 * 30) {
	return `prismatica_refresh=${encodeURIComponent(token)}; HttpOnly; SameSite=Lax; Secure; Path=/api/auth; Max-Age=${maxAge}`;
}

function clearRefreshCookie() {
	return 'prismatica_refresh=; HttpOnly; SameSite=Lax; Secure; Path=/api/auth; Max-Age=0';
}

function rateLimit(ip, action) {
	const key = `${ip}:${action}`;
	const now = Date.now();
	const windowMs = 60_000;
	const limit = action === 'login' ? 8 : 12;
	const bucket = buckets.get(key) ?? { count: 0, resetAt: now + windowMs, failures: 0 };
	if (now > bucket.resetAt) {
		bucket.count = 0;
		bucket.resetAt = now + windowMs;
	}
	bucket.count += 1;
	buckets.set(key, bucket);
	if (bucket.count <= limit) return null;
	const retryAfter = Math.ceil((bucket.resetAt - now) / 1000) + Math.min(bucket.failures * 2, 30);
	bucket.failures += 1;
	return retryAfter;
}

async function verifyTurnstile(token, ip) {
	if (config.turnstileBypassLocal && (!token || token === 'localhost-turnstile-token')) return true;
	if (!config.turnstileSecret || !token) return false;
	const form = new URLSearchParams({ secret: config.turnstileSecret, response: token, remoteip: ip });
	const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body: form });
	const payload = await response.json().catch(() => ({}));
	return payload?.success === true;
}

async function gotrue(path, body, authorization = config.anonKey) {
	const response = await fetch(`${config.baasUrl}${path}`, {
		method: 'POST',
		headers: { apikey: config.anonKey, Authorization: `Bearer ${authorization}`, Accept: 'application/json', 'Content-Type': 'application/json' },
		body: JSON.stringify(body),
	});
	const text = await response.text();
	let payload = {};
	try { payload = text ? JSON.parse(text) : {}; } catch { payload = { message: text }; }
	return { response, payload };
}

async function audit(eventType, _request, details = {}) {
	if (!config.serviceKey) return;
	await fetch(`${config.baasUrl}/rest/v1/rpc/auth_record_audit_event`, {
		method: 'POST',
		headers: { apikey: config.serviceKey, Authorization: `Bearer ${config.serviceKey}`, Accept: 'application/json', 'Content-Type': 'application/json' },
		body: JSON.stringify({ event_type: eventType, email: details.email ?? null, details: { ...details, request_id: randomUUID() } }),
	}).catch(() => undefined);
}

function sanitizeAuthPayload(payload) {
	const safePayload = { ...payload };
	delete safePayload.refresh_token;
	return safePayload;
}

function humanAuthMessage(payload, fallback) {
	const candidates = [payload?.error_description, payload?.msg, payload?.message, payload?.error];
	const message = candidates.find((value) => typeof value === 'string' && value.trim().length > 0);
	return message ? message.trim().slice(0, 240) : fallback;
}

function cleanText(value, maxLength) {
	return String(value ?? '').trim().slice(0, maxLength);
}

function cleanOptionalUrl(value) {
	const url = cleanText(value, 255);
	if (!url) return '';
	try {
		const parsed = new URL(url);
		return parsed.protocol === 'https:' ? parsed.toString() : '';
	} catch {
		return '';
	}
}

function registrationProfile(payload) {
	const rawProfile = typeof payload.profile === 'object' && payload.profile !== null ? payload.profile : {};
	return {
		username: cleanText(rawProfile.username, 32),
		confirmEmail: cleanText(rawProfile.confirmEmail, 255).toLowerCase(),
		confirmPassword: String(rawProfile.confirmPassword ?? ''),
		first_name: cleanText(rawProfile.firstName, 80),
		last_name: cleanText(rawProfile.lastName, 80),
		avatar_url: cleanOptionalUrl(rawProfile.avatarUrl),
		bio: cleanText(rawProfile.bio, 280),
		theme: THEME_VALUES.has(String(rawProfile.theme)) ? String(rawProfile.theme) : 'light',
		notifications_enabled: rawProfile.notificationsEnabled !== false,
	};
}

async function protectedAction(request, response, action, handler) {
	const ip = clientIp(request);
	const retryAfter = rateLimit(ip, action);
	if (retryAfter) {
		json(response, 429, { message: 'Too many attempts. Please retry later.' }, { 'retry-after': String(retryAfter) });
		return;
	}
	const payload = await readJson(request);
	const validTurnstile = await verifyTurnstile(String(payload.turnstileToken ?? ''), ip);
	if (!validTurnstile) {
		await audit(`${action}_turnstile_failed`, request, { email: payload.email });
		json(response, 403, { message: 'Anti-abuse verification failed.' });
		return;
	}
	await handler(payload, ip);
}

async function handleRegister(request, response) {
	await protectedAction(request, response, 'register', async (payload) => {
		const email = String(payload.email ?? '').trim().toLowerCase();
		const password = String(payload.password ?? '');
		const profile = registrationProfile(payload);
		if (!EMAIL_REGEX.test(email) || !PASSWORD_REGEX.test(password) || !USERNAME_REGEX.test(profile.username) || profile.confirmEmail !== email || profile.confirmPassword !== password) {
			json(response, 422, { message: 'Invalid email or password policy.' });
			return;
		}
		const userMetadata = {
			username: profile.username,
			first_name: profile.first_name || undefined,
			last_name: profile.last_name || undefined,
			avatar_url: profile.avatar_url || undefined,
			bio: profile.bio || undefined,
			theme: profile.theme,
			notifications_enabled: profile.notifications_enabled,
		};
		const result = await gotrue('/auth/v1/signup', { email, password, data: userMetadata, email_redirect_to: `${config.siteUrl}/auth/confirm` });
		await audit(result.response.ok ? 'register_requested' : 'register_failed', request, { email, status: result.response.status });
		json(response, result.response.ok ? 200 : result.response.status, result.response.ok ? { message: 'Check your email to confirm the account before signing in.' } : { message: humanAuthMessage(result.payload, 'Registration failed.') });
	});
}

async function handleLogin(request, response) {
	await protectedAction(request, response, 'login', async (payload) => {
		const email = String(payload.email ?? '').trim().toLowerCase();
		const password = String(payload.password ?? '');
		if (!EMAIL_REGEX.test(email) || password.length === 0) {
			json(response, 422, { message: 'Invalid credentials.' });
			return;
		}
		const result = await gotrue('/auth/v1/token?grant_type=password', { email, password });
		await audit(result.response.ok ? 'login_success' : 'login_failed', request, { email, status: result.response.status });
		if (!result.response.ok) {
			json(response, result.response.status, { message: humanAuthMessage(result.payload, 'Invalid credentials.') });
			return;
		}
		const refreshToken = typeof result.payload.refresh_token === 'string' ? result.payload.refresh_token : '';
		const headers = refreshToken ? { 'set-cookie': refreshCookie(refreshToken) } : {};
		json(response, 200, sanitizeAuthPayload(result.payload), headers);
	});
}

async function handleRecover(request, response) {
	await protectedAction(request, response, 'recover', async (payload) => {
		const email = String(payload.email ?? '').trim().toLowerCase();
		if (EMAIL_REGEX.test(email)) {
			await gotrue('/auth/v1/recover', { email });
			await audit('password_recovery_requested', request, { email });
		}
		json(response, 200, { message: 'If an account exists for that email, a reset link has been sent.' });
	});
}

async function handleRefresh(request, response) {
	const refreshToken = decodeURIComponent(cookieValue(request, 'prismatica_refresh'));
	if (!refreshToken) {
		json(response, 401, { message: 'No refresh session.' });
		return;
	}
	const result = await gotrue('/auth/v1/token?grant_type=refresh_token', { refresh_token: refreshToken });
	await audit(result.response.ok ? 'refresh_success' : 'refresh_failed', request, { status: result.response.status });
	if (!result.response.ok) {
		json(response, 401, { message: 'Refresh session expired.' }, { 'set-cookie': clearRefreshCookie() });
		return;
	}
	const nextRefreshToken = typeof result.payload.refresh_token === 'string' ? result.payload.refresh_token : refreshToken;
	json(response, 200, sanitizeAuthPayload(result.payload), { 'set-cookie': refreshCookie(nextRefreshToken) });
}

async function handleLogout(request, response) {
	await audit('logout', request);
	json(response, 200, { message: 'Signed out.' }, { 'set-cookie': clearRefreshCookie() });
}

function handleMfaHook(response) {
	json(response, 501, { message: 'MFA hook reserved. Wire this endpoint to TOTP or WebAuthn provider integration before enabling in production.' });
}

const routes = new Map([
	['POST /api/auth/register', handleRegister],
	['POST /api/auth/login', handleLogin],
	['POST /api/auth/recover', handleRecover],
	['POST /api/auth/refresh', handleRefresh],
	['POST /api/auth/logout', handleLogout],
]);

createServer(async (request, response) => {
	try {
		if (request.method === 'OPTIONS') {
			response.writeHead(204, { 'access-control-allow-origin': config.siteUrl, 'access-control-allow-credentials': 'true', 'access-control-allow-methods': 'POST, OPTIONS', 'access-control-allow-headers': 'content-type' });
			response.end();
			return;
		}
		const url = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`);
		const route = routes.get(`${request.method} ${url.pathname}`);
		if (route) {
			await route(request, response);
			return;
		}
		if (request.method === 'POST' && url.pathname.startsWith('/api/auth/mfa/')) {
			handleMfaHook(response);
			return;
		}
		json(response, 404, { message: 'Not found.' });
	} catch (error) {
		const status = Number(error?.status ?? 500);
		json(response, status, { message: status >= 500 ? 'Authentication gateway error.' : String(error?.message ?? 'Request error.') });
	}
}).listen(config.port, () => {
	console.log(`Auth gateway listening on http://localhost:${config.port}/api/auth`);
});
