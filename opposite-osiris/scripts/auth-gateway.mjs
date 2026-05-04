#!/usr/bin/env node
import { createServer } from 'node:http';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { randomBytes, randomUUID } from 'node:crypto';
import { resolve4, resolve6, resolveMx } from 'node:dns/promises';
import tls from 'node:tls';
import { createClient, MiniBaasError } from '@mini-baas/js';

for (const file of ['.env.local', '.env', '../infrastructure/baas/.env.local']) {
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
	baasUrl: (process.env.PUBLIC_BAAS_URL?.startsWith('/api') ? 'http://localhost:8000' : (process.env.PUBLIC_BAAS_URL ?? 'http://localhost:8000')).replace(/\/$/, ''),
	anonKey: process.env.PUBLIC_BAAS_ANON_KEY ?? process.env.KONG_PUBLIC_API_KEY ?? '',
	serviceKey: process.env.SERVICE_ROLE_KEY ?? process.env.KONG_SERVICE_API_KEY ?? '',
	turnstileSecret: process.env.TURNSTILE_SECRET_KEY ?? '',
	turnstileBypassLocal: process.env.TURNSTILE_BYPASS_LOCAL === 'true',
	siteUrl: process.env.PUBLIC_SITE_URL ?? 'http://localhost:4322',
	smtpHost: process.env.SMTP_HOST ?? '',
	smtpPort: Number(process.env.SMTP_PORT ?? 465),
	smtpUsername: process.env.SMTP_USERNAME ?? process.env.SMTP_USER ?? '',
	smtpPassword: process.env.SMTP_PASSWORD ?? process.env.SMTP_PASS ?? '',
	smtpFromName: process.env.SMTP_FROM_NAME ?? 'Prismatica',
	smtpFromAddress: process.env.SMTP_FROM_ADDRESS ?? process.env.EMAIL_FROM ?? process.env.SMTP_USERNAME ?? process.env.SMTP_USER ?? '',
	requireEmailVerification: process.env.AUTH_REQUIRE_EMAIL_VERIFICATION !== 'false' && process.env.PUBLIC_AUTH_REQUIRE_EMAIL_VERIFICATION !== 'false',
};

const buckets = new Map();
const mailDomainCache = new Map();
const EMAIL_ATEXT = "A-Za-z0-9!#$%&'*+/=?^_`{|}~-";
const EMAIL_LOCAL_PART = String.raw`(?:[${EMAIL_ATEXT}]+(?:\.[${EMAIL_ATEXT}]+)*|"[^"\r\n]+")`;
const EMAIL_DOMAIN_LABEL = '(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)';
const EMAIL_REGEX = new RegExp(String.raw`^${EMAIL_LOCAL_PART}@(?:${EMAIL_DOMAIN_LABEL}\.)+[A-Za-z]{2,63}$`);
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
const USERNAME_REGEX = /^\w[\w.-]{2,31}$/;
const MAIL_DOMAIN_CACHE_MS = 10 * 60 * 1000;
const DNS_LOOKUP_TIMEOUT_MS = 3500;
const GOTRUE_MANAGED_PROFILE_MARKER = 'managed-by-gotrue';
const publicBaas = createClient({ url: config.baasUrl, anonKey: config.anonKey, persistSession: false });
const serviceBaas = config.serviceKey
	? createClient({ url: config.baasUrl, anonKey: config.anonKey || config.serviceKey, serviceRoleKey: config.serviceKey, accessToken: config.serviceKey, persistSession: false })
	: null;

function sdkResult(payload, status = 200) {
	return { response: { ok: status >= 200 && status < 300, status, statusText: '' }, payload: payload ?? {} };
}

function sdkErrorResult(error) {
	if (error instanceof MiniBaasError) {
		return { response: { ok: false, status: error.status, statusText: error.message }, payload: error.body ?? { message: error.message } };
	}
	return { response: { ok: false, status: 500, statusText: 'SDK request failed' }, payload: { message: error instanceof Error ? error.message : 'SDK request failed' } };
}

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

function emailDomain(email) {
	return String(email).split('@').pop()?.toLowerCase() ?? '';
}

async function hasDeliverableEmailDomain(email) {
	const domain = emailDomain(email);
	const cached = mailDomainCache.get(domain);
	if (cached && cached.expiresAt > Date.now()) return cached.valid;
	const timeout = new Promise((resolveTimeout) => globalThis.setTimeout(() => resolveTimeout(false), DNS_LOOKUP_TIMEOUT_MS));
	const lookup = Promise.allSettled([resolveMx(domain), resolve4(domain), resolve6(domain)]).then((results) => results.some((result) => result.status === 'fulfilled' && Array.isArray(result.value) && result.value.length > 0));
	const valid = await Promise.race([lookup, timeout]);
	mailDomainCache.set(domain, { valid, expiresAt: Date.now() + MAIL_DOMAIN_CACHE_MS });
	return valid;
}

async function verifyTurnstile(token, ip) {
	if (config.turnstileBypassLocal && (!token || token === 'localhost-turnstile-token')) return true;
	if (!config.turnstileSecret || !token) return false;
	const form = new URLSearchParams({ secret: config.turnstileSecret, response: token, remoteip: ip });
	const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body: form });
	const payload = await response.json().catch(() => ({}));
	return payload?.success === true;
}

async function signInWithPassword(body) {
	try {
		return sdkResult(await publicBaas.auth.signInWithPassword(body));
	} catch (error) {
		return sdkErrorResult(error);
	}
}

async function refreshAuthSession(refreshToken) {
	try {
		return sdkResult(await publicBaas.auth.refreshSession(refreshToken));
	} catch (error) {
		return sdkErrorResult(error);
	}
}

async function signUpAccount(body) {
	try {
		return sdkResult(await publicBaas.auth.signUp(body));
	} catch (error) {
		return sdkErrorResult(error);
	}
}

async function recoverAccount(body) {
	try {
		return sdkResult(await publicBaas.auth.recover(body));
	} catch (error) {
		return sdkErrorResult(error);
	}
}

async function createAdminUser(body) {
	try {
		if (!serviceBaas) throw new Error('Missing service role key.');
		return sdkResult(await serviceBaas.auth.admin.createUser(body));
	} catch (error) {
		return sdkErrorResult(error);
	}
}

async function generateAdminLink(body) {
	try {
		if (!serviceBaas) throw new Error('Missing service role key.');
		return sdkResult(await serviceBaas.auth.admin.generateLink(body));
	} catch (error) {
		return sdkErrorResult(error);
	}
}

async function updateAdminUser(userId, body) {
	try {
		if (!serviceBaas) throw new Error('Missing service role key.');
		return sdkResult(await serviceBaas.auth.admin.updateUser(userId, body));
	} catch (error) {
		return sdkErrorResult(error);
	}
}

async function localProfileExists(column, value) {
	if (!value || !serviceBaas) return false;
	return serviceBaas.from('users').exists({ filters: { [column]: value } });
}

async function identityAvailability({ email = '', username = '' }) {
	const normalizedEmail = String(email).trim().toLowerCase();
	const normalizedUsername = cleanText(username, 32);
	const emailValid = EMAIL_REGEX.test(normalizedEmail);
	const usernameValid = USERNAME_REGEX.test(normalizedUsername);
	const emailTaken = emailValid ? await localProfileExists('email', normalizedEmail) : false;
	const usernameTaken = usernameValid ? await localProfileExists('username', normalizedUsername) : false;
	let emailMessage = 'Enter a valid email first.';
	if (emailValid) emailMessage = emailTaken ? 'This email is already registered.' : 'Email is available.';
	let usernameMessage = 'Use 3–32 letters, numbers, dots, underscores, or hyphens.';
	if (usernameValid) usernameMessage = usernameTaken ? 'This username is already taken.' : 'Username is available.';
	return {
		email: {
			checked: emailValid,
			available: emailValid ? !emailTaken : null,
			message: emailMessage,
		},
		username: {
			checked: usernameValid,
			available: usernameValid ? !usernameTaken : null,
			message: usernameMessage,
		},
	};
}

async function restRpc(name, body, authorization = config.anonKey) {
	try {
		return sdkResult(await publicBaas.rpc(name, body, { bearerToken: authorization }));
	} catch (error) {
		return sdkErrorResult(error);
	}
}

async function audit(eventType, _request, details = {}) {
	if (!serviceBaas || !config.serviceKey) return;
	await serviceBaas.rpc('auth_record_audit_event', { event_type: eventType, email: details.email ?? null, details: { ...details, request_id: randomUUID() } }, { apiKey: config.serviceKey, bearerToken: config.serviceKey }).catch(() => undefined);
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

function escapeHtml(value) {
	return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}

function smtpBody({ to, subject, html }) {
	const fromName = config.smtpFromName.replaceAll('\r', ' ').replaceAll('\n', ' ').trim();
	const fromAddress = config.smtpFromAddress.replaceAll('\r', '').replaceAll('\n', '').trim();
	return [
		`From: ${fromName} <${fromAddress}>`,
		`To: ${to}`,
		`Subject: ${subject}`,
		'MIME-Version: 1.0',
		'Content-Type: text/html; charset=UTF-8',
		'',
		html,
	].join('\r\n');
}

function hasSmtpConfig() {
	return Boolean(config.smtpHost && config.smtpFromAddress);
}

function createSmtpClient() {
	const socket = tls.connect({ host: config.smtpHost, port: config.smtpPort, servername: config.smtpHost, rejectUnauthorized: true });
	socket.setEncoding('utf8');
	let buffer = '';
	const lines = [];
	const waiters = [];

	function flushWaiters() {
		while (lines.length > 0 && waiters.length > 0) {
			waiters.shift().resolve(lines.shift());
		}
	}

	socket.on('data', (chunk) => {
		buffer += chunk;
		let index = buffer.indexOf('\n');
		while (index >= 0) {
			lines.push(buffer.slice(0, index).replace(/\r$/, ''));
			buffer = buffer.slice(index + 1);
			index = buffer.indexOf('\n');
		}
		flushWaiters();
	});

	const readLine = (timeoutMs = 10000) => new Promise((resolveLine, rejectLine) => {
		if (lines.length > 0) {
			resolveLine(lines.shift());
			return;
		}
		const timer = setTimeout(() => rejectLine(new Error('SMTP read timed out.')), timeoutMs);
		waiters.push({
			resolve: (line) => {
				clearTimeout(timer);
				resolveLine(line);
			},
		});
	});

	async function readResponse() {
		const responseLines = [];
		let code = '';
		for (;;) {
			const line = String(await readLine());
			responseLines.push(line);
			code ||= line.slice(0, 3);
			if (/^\d{3} /.test(line)) {
				return { code: Number(code), text: responseLines.join('\n') };
			}
		}
	}

	async function send(line, expectedCodes) {
		socket.write(`${line}\r\n`);
		const response = await readResponse();
		if (!expectedCodes.includes(response.code)) {
			throw new Error(`SMTP command failed with ${response.code}.`);
		}
		return response;
	}

	return { socket, readResponse, send };
}

async function sendSmtpMail(message) {
	if (!config.smtpHost || !config.smtpUsername || !config.smtpPassword || !config.smtpFromAddress) {
		throw Object.assign(new Error('SMTP is not configured.'), { status: 503 });
	}
	const client = createSmtpClient();
	try {
		await new Promise((resolveConnect, rejectConnect) => {
			client.socket.once('secureConnect', resolveConnect);
			client.socket.once('error', rejectConnect);
		});
		const greeting = await client.readResponse();
		if (greeting.code !== 220) throw new Error('SMTP greeting failed.');
		await client.send('EHLO prismatica.local', [250]);
		await client.send('AUTH LOGIN', [334]);
		await client.send(Buffer.from(config.smtpUsername, 'utf8').toString('base64'), [334]);
		await client.send(Buffer.from(config.smtpPassword, 'utf8').toString('base64'), [235]);
		await client.send(`MAIL FROM:<${config.smtpFromAddress}>`, [250]);
		await client.send(`RCPT TO:<${message.to}>`, [250, 251]);
		await client.send('DATA', [354]);
		await client.send(`${smtpBody(message)}\r\n.`, [250]);
		await client.send('QUIT', [221]).catch(() => undefined);
		client.socket.end();
	} catch (error) {
		client.socket.destroy();
		throw error;
	}
}

function cleanText(value, maxLength) {
	return String(value ?? '').trim().slice(0, maxLength);
}

function registrationProfile(payload) {
	const rawProfile = typeof payload.profile === 'object' && payload.profile !== null ? payload.profile : {};
	return {
		username: cleanText(rawProfile.username, 32),
		confirmPassword: String(rawProfile.confirmPassword ?? ''),
		email_verification_consent: rawProfile.emailVerificationConsent !== false,
		notifications_enabled: true,
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

function registrationContext(payload) {
	const email = String(payload.email ?? '').trim().toLowerCase();
	const password = String(payload.password ?? '');
	const profile = registrationProfile(payload);
	const userMetadata = {
		username: profile.username,
		theme: 'light',
		notifications_enabled: profile.notifications_enabled,
	};
	return { email, password, profile, userMetadata };
}

function isValidRegistrationContext({ email, password, profile }) {
	return EMAIL_REGEX.test(email)
		&& PASSWORD_REGEX.test(password)
		&& USERNAME_REGEX.test(profile.username)
		&& profile.confirmPassword === password
		&& (!config.requireEmailVerification || profile.email_verification_consent);
}

async function createDevConfirmedAccount({ email, password, userMetadata }) {
	const result = await createAdminUser({
		email,
		password,
		email_confirm: true,
		user_metadata: userMetadata,
	});
	if (result.response.status !== 405) return result;
	const signup = await signUpAccount({ email, password, data: userMetadata });
	const userId = signup.payload?.user?.id ?? signup.payload?.id;
	if (signup.response.ok && typeof userId === 'string') {
		await updateAdminUser(userId, { email_confirm: true }).catch(() => undefined);
	}
	return signup;
}

async function createLocalUserProfile({ email, profile }, isEmailVerified) {
	try {
		if (!serviceBaas) throw new Error('Missing service role key.');
		return sdkResult(await serviceBaas.from('users').insert({
			username: profile.username,
			email,
			password_hash: GOTRUE_MANAGED_PROFILE_MARKER,
			theme: 'light',
			notifications_enabled: profile.notifications_enabled,
			is_email_verified: isEmailVerified,
		}));
	} catch (error) {
		return sdkErrorResult(error);
	}
}

async function ensureLocalUserProfile(request, response, context, isEmailVerified) {
	const profile = await createLocalUserProfile(context, isEmailVerified);
	if (profile.response.ok) return true;
	await audit('register_failed', request, { email: context.email, status: profile.response.status, stage: 'local_profile' });
	const message = humanAuthMessage(profile.payload, 'Account was created, but the local profile could not be created.');
	json(response, profile.response.status === 409 ? 409 : 502, { message });
	return false;
}

async function handleDevConfirmedRegistration(request, response, context) {
	const result = await createDevConfirmedAccount(context);
	if (!result.response.ok) {
		await audit('register_dev_failed', request, { email: context.email, status: result.response.status });
		json(response, result.response.status, { message: humanAuthMessage(result.payload, 'Development registration failed.') });
		return;
	}
	if (!await ensureLocalUserProfile(request, response, context, true)) {
		return;
	}
	await audit('register_dev_confirmed', request, { email: context.email });
	json(response, 200, { message: 'Development account created and confirmed. You can sign in now.' });
}

async function handleEmailVerifiedRegistration(request, response, context) {
	const result = await generateAdminLink({
		type: 'signup',
		email: context.email,
		password: context.password,
		data: context.userMetadata,
		redirect_to: `${config.siteUrl.replace(/\/$/, '')}/auth/confirm`,
	});
	await audit(result.response.ok ? 'register_requested' : 'register_failed', request, { email: context.email, status: result.response.status });
	if (!result.response.ok) {
		json(response, result.response.status, { message: humanAuthMessage(result.payload, 'Registration failed.') });
		return;
	}
	const token = typeof result.payload.hashed_token === 'string' ? result.payload.hashed_token : '';
	const actionLink = typeof result.payload.action_link === 'string' ? result.payload.action_link : '';
	const confirmUrl = token ? `${config.siteUrl.replace(/\/$/, '')}/auth/confirm/?token=${encodeURIComponent(token)}` : actionLink;
	if (!confirmUrl) {
		json(response, 502, { message: 'Could not create the email verification link.' });
		return;
	}
	await sendSmtpMail({
		to: context.email,
		subject: 'Confirm your Prismatica account',
		html: `<p>Hello,</p><p>Confirm your Prismatica account before signing in:</p><p><a href="${escapeHtml(confirmUrl)}">Confirm account</a></p><p>If you did not request this account, you can ignore this email.</p><p>Prismatica</p>`,
	});
	if (!await ensureLocalUserProfile(request, response, context, false)) {
		return;
	}
	json(response, 200, { message: 'Check your email to confirm the account before signing in.' });
}

async function handleRegister(request, response) {
	await protectedAction(request, response, 'register', async (payload) => {
		const context = registrationContext(payload);
		if (!isValidRegistrationContext(context)) {
			json(response, 422, { message: 'Invalid email or password policy.' });
			return;
		}
		if (!await hasDeliverableEmailDomain(context.email)) {
			json(response, 422, { message: 'Use an email domain that can receive mail.' });
			return;
		}
		if (!config.serviceKey || (config.requireEmailVerification && !hasSmtpConfig())) {
			json(response, 503, { message: 'Email verification is not configured.' });
			return;
		}
		const availability = await identityAvailability({ email: context.email, username: context.profile.username });
		if (availability.email.available === false || availability.username.available === false) {
			json(response, 409, {
				message: availability.email.available === false ? availability.email.message : availability.username.message,
				email: availability.email,
				username: availability.username,
			});
			return;
		}
		if (!config.requireEmailVerification || !context.profile.email_verification_consent) {
			await handleDevConfirmedRegistration(request, response, context);
			return;
		}
		await handleEmailVerifiedRegistration(request, response, context);
	});
}

async function handleAvailability(request, response) {
	if (!config.serviceKey) {
		json(response, 503, { message: 'Registration availability is not configured.' });
		return;
	}
	const url = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`);
	const availability = await identityAvailability({
		email: url.searchParams.get('email') ?? '',
		username: url.searchParams.get('username') ?? '',
	});
	json(response, 200, availability);
}

async function handleLogin(request, response) {
	await protectedAction(request, response, 'login', async (payload) => {
		const email = String(payload.email ?? '').trim().toLowerCase();
		const password = String(payload.password ?? '');
		if (!EMAIL_REGEX.test(email) || password.length === 0) {
			json(response, 422, { message: 'Invalid credentials.' });
			return;
		}
		const result = await signInWithPassword({ email, password });
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
		if (EMAIL_REGEX.test(email) && await hasDeliverableEmailDomain(email)) {
			await recoverAccount({ email });
			await audit('password_recovery_requested', request, { email });
		}
		json(response, 200, { message: 'If an account exists for that email, a reset link has been sent.' });
	});
}

async function handleNewsletterSubscribe(request, response) {
	const ip = clientIp(request);
	const retryAfter = rateLimit(ip, 'newsletter');
	if (retryAfter) {
		json(response, 429, { message: 'Too many attempts. Please retry later.' }, { 'retry-after': String(retryAfter) });
		return;
	}
	const payload = await readJson(request);
	const email = String(payload.email ?? '').trim().toLowerCase();
	if (!EMAIL_REGEX.test(email)) {
		json(response, 422, { message: 'Use a valid email address.' });
		return;
	}
	if (!await hasDeliverableEmailDomain(email)) {
		json(response, 422, { message: 'Use an email domain that can receive mail.' });
		return;
	}
	const token = randomBytes(32).toString('hex');
	const result = await restRpc('gdpr_request_newsletter_optin', { email, token });
	if (!result.response.ok) {
		json(response, result.response.status, { message: humanAuthMessage(result.payload, 'Could not start the newsletter confirmation.') });
		return;
	}
	const confirmUrl = `${config.siteUrl.replace(/\/$/, '')}/newsletter/confirm/?token=${encodeURIComponent(token)}`;
	await sendSmtpMail({
		to: email,
		subject: 'Confirm your Prismatica newsletter subscription',
		html: `<p>Hello,</p><p>Please confirm your Prismatica newsletter subscription:</p><p><a href="${confirmUrl}">Confirm subscription</a></p><p>If you did not request this, you can ignore this email.</p><p>Prismatica</p>`,
	});
	await audit('newsletter_optin_requested', request, { email });
	json(response, 200, { message: `Check ${escapeHtml(email)} to confirm your subscription.` });
}

async function handleRefresh(request, response) {
	const refreshToken = decodeURIComponent(cookieValue(request, 'prismatica_refresh'));
	if (!refreshToken) {
		json(response, 401, { message: 'No refresh session.' });
		return;
	}
	const result = await refreshAuthSession(refreshToken);
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
	['GET /api/auth/availability', handleAvailability],
	['POST /api/auth/register', handleRegister],
	['POST /api/auth/login', handleLogin],
	['POST /api/auth/recover', handleRecover],
	['POST /api/auth/refresh', handleRefresh],
	['POST /api/auth/logout', handleLogout],
	['POST /api/newsletter/subscribe', handleNewsletterSubscribe],
]);

createServer(async (request, response) => {
	try {
		if (request.method === 'OPTIONS') {
			response.writeHead(204, { 'access-control-allow-origin': config.siteUrl, 'access-control-allow-credentials': 'true', 'access-control-allow-methods': 'GET, POST, OPTIONS', 'access-control-allow-headers': 'content-type' });
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
	console.log(`Auth gateway listening on http://localhost:${config.port}/api/auth and /api/newsletter`);
});
