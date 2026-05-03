import { fetchSeededUsers } from '../lib/baas-client';
import { baasConfig } from '../lib/baas-config';
import { authConfig } from '../lib/auth-config';
import { type RegisterProfile, useAuth, validatePassword } from '../hooks/useAuth';
import { CONSENT_STORAGE_KEY, CSRF_STORAGE_KEY, NEWSLETTER_INTENT_KEY, POLICY_VERSION } from '../data/legal';

type ThemeName = 'light' | 'dark' | 'night';

type PortalMode = 'start' | 'connect';

type MascotMood = 'curious' | 'close' | 'gentle' | 'happy' | 'excited' | 'listening' | 'sleeping' | 'bye' | 'thinking' | 'shy' | 'proud' | 'seller' | 'laughing' | 'silly' | 'surprised' | 'scared' | 'love' | 'angry' | 'dizzy';

type MascotState = {
	targetX: number;
	targetY: number;
	targetHeadX: number;
	targetHeadY: number;
	depthX: number;
	depthY: number;
	eyeX: number;
	eyeY: number;
	headX: number;
	headY: number;
	lastPointerAngle: number | undefined;
	orbitTravel: number;
	lastBrowLift: number;
	lastMove: number;
	lockedUntil: number;
	idleMoodShown: boolean;
	moodTimer: number | undefined;
	heartTimer: number | undefined;
	zTimer: number | undefined;
	laughTimer: number | undefined;
	frame: number | undefined;
	previousFocus: HTMLElement | null;
	releaseFocusTrap: (() => void) | null;
};

type PortalNoticeTone = 'success' | 'error';

type AuthTokenResponse = {
	access_token?: string;
	expires_in?: number;
};

type ConsentPreferences = {
	analytics: boolean;
	newsletter: boolean;
	marketing: boolean;
	policyVersion: string;
	savedAt: string;
};

type TurnstileApi = {
	render: (container: HTMLElement, options: { sitekey: string; callback: (token: string) => void; 'error-callback': () => void; 'expired-callback': () => void }) => string;
	reset?: (widgetId?: string) => void;
};

type TrustedHtmlPolicy = {
	createHTML: (markup: string) => unknown;
};

type TrustedTypesFactory = {
	createPolicy: (name: string, rules: { createHTML: (markup: string) => string }) => TrustedHtmlPolicy;
};

type AuthModeControls = {
	authTitle: Element | null;
	authNote: Element | null;
	submitButton: Element | null;
	termsConsent: Element | null;
	email: Element | null;
	username: Element | null;
	confirmEmail: Element | null;
	password: Element | null;
	confirmPassword: Element | null;
};

declare global {
	var turnstile: TurnstileApi | undefined;
}

const THEME_KEY = 'prismatica-theme';
const MOTION_KEY = 'prismatica-motion-paused';
const AUTH_TOKEN_KEY = 'prismatica-auth-token-v1';
const THEMES: ThemeName[] = ['light', 'dark', 'night'];
const authClient = useAuth();
let trustedHtmlPolicy: TrustedHtmlPolicy | null | undefined;
const mascotState: MascotState = {
	targetX: 0,
	targetY: 0,
	targetHeadX: 0,
	targetHeadY: 0,
	depthX: 5,
	depthY: 4,
	eyeX: 0,
	eyeY: 0,
	headX: 0,
	headY: 0,
	lastPointerAngle: undefined,
	orbitTravel: 0,
	lastBrowLift: 0,
	lastMove: Date.now(),
	lockedUntil: 0,
	idleMoodShown: false,
	moodTimer: undefined,
	heartTimer: undefined,
	zTimer: undefined,
	laughTimer: undefined,
	frame: undefined,
	previousFocus: null,
	releaseFocusTrap: null,
};

/** Returns an internal TrustedHTML value when the browser enforces Trusted Types. */
function trustedHTML(markup: string): unknown {
	if (trustedHtmlPolicy === undefined) {
		const trustedTypes = (globalThis as typeof globalThis & { trustedTypes?: TrustedTypesFactory }).trustedTypes;
		try {
			trustedHtmlPolicy = trustedTypes?.createPolicy('default', { createHTML: (value) => value }) ?? null;
		} catch {
			trustedHtmlPolicy = null;
		}
	}
	return trustedHtmlPolicy ? trustedHtmlPolicy.createHTML(markup) : markup;
}

/** Assigns static internal markup through Trusted Types-aware DOM sinks. */
function setTrustedInnerHTML(element: HTMLElement, markup: string): void {
	(element as unknown as { innerHTML: unknown }).innerHTML = trustedHTML(markup);
}

/** Inserts static internal markup through Trusted Types-aware DOM sinks. */
function insertTrustedHTML(element: HTMLElement, position: InsertPosition, markup: string): void {
	element.insertAdjacentHTML(position, trustedHTML(markup) as string);
}

/** Restricts a number to the expected animation range. */
function clamp(value: number, min: number, max: number): number {
	return Math.min(Math.max(value, min), max);
}

/** Returns an element when it matches the expected runtime type. */
function queryElement<T extends Element>(selector: string, guard: (element: Element) => element is T): T | null {
	const element = document.querySelector(selector);
	return element && guard(element) ? element : null;
}


/** Returns all elements matching the expected runtime type. */
function queryElements<T extends Element>(selector: string, guard: (element: Element) => element is T): T[] {
	return Array.from(document.querySelectorAll(selector)).filter(guard);
}

/** Narrows an element to an HTML button. */
function isButton(element: Element): element is HTMLButtonElement {
	return element instanceof HTMLButtonElement;
}

/** Narrows an element to a generic HTML element. */
function isHtmlElement(element: Element): element is HTMLElement {
	return element instanceof HTMLElement;
}

/** Narrows an element to an input field. */
function isInput(element: Element): element is HTMLInputElement {
	return element instanceof HTMLInputElement;
}

/** Returns the current Turnstile token or a localhost bypass token when configured. */
function readTurnstileToken(portal: HTMLElement): string {
	const token = portal.querySelector('[data-turnstile-token]');
	if (token instanceof HTMLInputElement && token.value) {
		return token.value;
	}
	return authConfig.turnstileSiteKey ? '' : 'localhost-turnstile-token';
}

/** Renders the Cloudflare Turnstile widget into the active auth portal. */
function mountTurnstile(portal: HTMLElement): void {
	const container = portal.querySelector('[data-turnstile-widget]');
	const token = portal.querySelector('[data-turnstile-token]');
	if (!(container instanceof HTMLElement) || !(token instanceof HTMLInputElement)) {
		return;
	}
	if (!authConfig.turnstileSiteKey) {
		token.value = 'localhost-turnstile-token';
		container.hidden = true;
		return;
	}
	const render = (): void => {
		if (!globalThis.turnstile || container.dataset.widgetId) {
			return;
		}
		container.dataset.widgetId = globalThis.turnstile.render(container, {
			sitekey: authConfig.turnstileSiteKey,
			callback: (value: string) => {
				token.value = value;
			},
			'error-callback': () => {
				token.value = '';
			},
			'expired-callback': () => {
				token.value = '';
			},
		});
	};
	render();
	if (!container.dataset.widgetId) {
		globalThis.setTimeout(render, 600);
	}
}

/** Safely reads a persisted value. */
function readStorage(key: string): string | null {
	try {
		return globalThis.localStorage.getItem(key);
	} catch {
		return null;
	}
}

/** Safely writes a persisted value. */
function writeStorage(key: string, value: string): void {
	try {
		globalThis.localStorage.setItem(key, value);
	} catch {
		return;
	}
}

/** Chooses the initial theme from storage or system preference. */
function initialTheme(): ThemeName {
	const stored = readStorage(THEME_KEY);
	if (stored === 'light' || stored === 'dark' || stored === 'night') {
		return stored;
	}
	return globalThis.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/** Returns the compact icon for the selected theme. */
function themeIcon(theme: ThemeName): string {
	const icons: Record<ThemeName, string> = {
		light: '☼',
		dark: '☾',
		night: '✦',
	};
	return icons[theme];
}

/** Updates visible and assistive theme button labels. */
function updateThemeButton(theme: ThemeName): void {
	const button = queryElement('#theme-toggle', isButton);
	const label = queryElement('[data-theme-label]', isHtmlElement);
	const nextTheme = THEMES[(THEMES.indexOf(theme) + 1) % THEMES.length] ?? 'light';
	const themeLabel = theme[0].toUpperCase() + theme.slice(1);
	const nextLabel = nextTheme[0].toUpperCase() + nextTheme.slice(1);
	if (button) {
		button.setAttribute('aria-label', `Theme: ${theme}. Switch to ${nextTheme} mode`);
		button.title = `Switch to ${nextLabel} theme`;
		const icon = button.querySelector('.header-icon--theme');
		if (icon instanceof HTMLElement) {
			icon.textContent = themeIcon(theme);
		}
	}
	if (label) {
		label.textContent = `Theme: ${themeLabel}`;
	}
}

/** Applies a theme to the document root. */
function applyTheme(theme: ThemeName): void {
	document.documentElement.dataset.theme = theme;
	document.documentElement.style.colorScheme = theme === 'light' ? 'light' : 'dark';
	writeStorage(THEME_KEY, theme);
	updateThemeButton(theme);
}

/** Advances the current theme. */
function cycleTheme(): void {
	const current = document.documentElement.dataset.theme as ThemeName | undefined;
	const index = current ? THEMES.indexOf(current) : -1;
	const nextTheme = THEMES[(index + 1) % THEMES.length] ?? 'light';
	applyTheme(nextTheme);
	announce(`${nextTheme[0].toUpperCase() + nextTheme.slice(1)} theme enabled`);
}

/** Updates visible and assistive motion button labels. */
function updateMotionButton(paused: boolean): void {
	const button = queryElement('#pause-animations', isButton);
	const label = queryElement('[data-motion-label]', isHtmlElement);
	if (button) {
		button.setAttribute('aria-pressed', String(paused));
		button.setAttribute('aria-label', paused ? 'Resume animations' : 'Pause animations');
		button.title = paused ? 'Resume animations' : 'Pause animations';
		const icon = button.querySelector('.header-icon--motion');
		if (icon instanceof HTMLElement) {
			icon.textContent = paused ? '▶' : 'Ⅱ';
		}
	}
	if (label) {
		label.textContent = paused ? 'Resume animations' : 'Pause animations';
	}
}

/** Applies the motion preference to the page. */
function applyMotionPreference(paused: boolean): void {
	document.documentElement.classList.toggle('motion-paused', paused);
	writeStorage(MOTION_KEY, paused ? 'true' : 'false');
	updateMotionButton(paused);
	announce(paused ? 'Animations paused' : 'Animations resumed');
}

/** Draws a subtle paper grain on the decorative canvas. */
function renderPaperGrain(): void {
	const canvas = queryElement('#paper-grain', (element): element is HTMLCanvasElement => element instanceof HTMLCanvasElement);
	if (!canvas) {
		return;
	}
	const context = canvas.getContext('2d');
	if (!context) {
		return;
	}
	const ratio = Math.min(window.devicePixelRatio || 1, 2);
	canvas.width = Math.floor(window.innerWidth * ratio);
	canvas.height = Math.floor(window.innerHeight * ratio);
	canvas.style.width = `${window.innerWidth}px`;
	canvas.style.height = `${window.innerHeight}px`;
	context.setTransform(ratio, 0, 0, ratio, 0, 0);
	context.clearRect(0, 0, window.innerWidth, window.innerHeight);
	for (let index = 0; index < 900; index += 1) {
		const alpha = Math.random() * 0.05;
		context.fillStyle = `rgba(28, 22, 18, ${alpha})`;
		context.fillRect(Math.random() * window.innerWidth, Math.random() * window.innerHeight, Math.random() * 1.8 + 0.4, Math.random() * 1.8 + 0.4);
	}
}

/** Announces dynamic state changes to assistive technology. */
function announce(message: string): void {
	const announcer = queryElement('#global-announcer', isHtmlElement);
	if (announcer) {
		announcer.textContent = message;
	}
}

/** Returns a PostgREST RPC endpoint URL. */
function rpcUrl(name: string): string {
	return `${baasConfig.url.replace(/\/$/, '')}/rest/v1/rpc/${name}`;
}

/** Reads the current demo auth token for authenticated RPC calls. */
function readAuthToken(): string | null {
	return readStorage(AUTH_TOKEN_KEY);
}

/** Calls a GDPR RPC with either the user's token or the anon key. */
async function callGdprRpc(name: string, body: Record<string, unknown>, token = readAuthToken()): Promise<Response> {
	if (!baasConfig.anonKey) {
		throw new Error('Missing PUBLIC_BAAS_ANON_KEY.');
	}

	return fetch(rpcUrl(name), {
		method: 'POST',
		headers: {
			apikey: baasConfig.anonKey,
			Authorization: `Bearer ${token ?? baasConfig.anonKey}`,
			Accept: 'application/json',
			'Content-Type': 'application/json',
		},
		body: JSON.stringify(body),
	});
}

/** Authenticates a portal login through the public BaaS gateway. */
async function authenticatePortalLogin(email: string, password: string, turnstileToken: string): Promise<AuthTokenResponse | null> {
	const payload = await authClient.signIn({ email, password, turnstileToken });
	if (payload.ok && typeof payload.accessToken === 'string' && payload.accessToken.length > 0) {
		writeStorage(AUTH_TOKEN_KEY, payload.accessToken);
		return { access_token: payload.accessToken, expires_in: payload.expiresIn };
	}
	return null;
}

/** Registers a portal account through the Turnstile-protected auth gateway. */
async function registerPortalAccount(email: string, password: string, turnstileToken: string, profile: RegisterProfile): Promise<boolean> {
	const payload = await authClient.register({ email, password, turnstileToken, profile });
	return payload.ok;
}

/** Requests a password recovery email without revealing whether the account exists. */
async function requestPasswordRecovery(email: string, turnstileToken: string): Promise<void> {
	const response = await authClient.recover({ email, turnstileToken });
	if (!response.ok && response.status >= 500) {
		throw new Error('Password recovery service is unavailable.');
	}
}

/** Persists consent preferences locally when no user token exists yet. */
function storeConsentPreferences(preferences: Omit<ConsentPreferences, 'policyVersion' | 'savedAt'>): ConsentPreferences {
	const record: ConsentPreferences = {
		...preferences,
		policyVersion: POLICY_VERSION,
		savedAt: new Date().toISOString(),
	};
	writeStorage(CONSENT_STORAGE_KEY, JSON.stringify(record));
	return record;
}

/** Reads locally stored consent preferences. */
function readConsentPreferences(): ConsentPreferences | null {
	const raw = readStorage(CONSENT_STORAGE_KEY);
	if (!raw) {
		return null;
	}
	try {
		return JSON.parse(raw) as ConsentPreferences;
	} catch {
		return null;
	}
}

/** Synchronises locally stored newsletter consent after login when possible. */
async function syncStoredConsents(token: string, email?: string): Promise<void> {
	const preferences = readConsentPreferences();
	if (preferences?.newsletter && email) {
		await callGdprRpc('gdpr_request_newsletter_optin', { email }, token).catch(() => undefined);
	}

	const newsletterIntent = readStorage(NEWSLETTER_INTENT_KEY);
	if (newsletterIntent && email) {
		await callGdprRpc('gdpr_request_newsletter_optin', { email }, token).catch(() => undefined);
		localStorage.removeItem(NEWSLETTER_INTENT_KEY);
	}
}

/** Clears any existing portal connection notification. */
function clearPortalNotification(portal: HTMLElement): void {
	portal.querySelector('.portal-notification')?.remove();
}

/** Shows an accessible portal connection notification above the login form. */
function showPortalNotification(portal: HTMLElement, tone: PortalNoticeTone, message: string, autoDismiss = false): void {
	clearPortalNotification(portal);
	const form = portal.querySelector('.portal-login');
	if (!(form instanceof HTMLFormElement)) {
		return;
	}

	const notification = document.createElement('div');
	notification.className = `portal-notification portal-notification--${tone}`;
	notification.setAttribute('role', 'status');
	notification.setAttribute('aria-live', 'polite');
	notification.setAttribute('aria-atomic', 'true');
	notification.tabIndex = -1;
	const iconPath = tone === 'success'
		? '<path d="M4 13.5 9.1 18 20 6" />'
		: '<path d="M12 4 21 20H3L12 4Z" /><path d="M12 9v4" /><path d="M12 16h.01" />';
	setTrustedInnerHTML(notification, `
		<svg class="portal-notification__icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${iconPath}</svg>
		<span>${message}</span>
		<button class="portal-notification__dismiss" type="button" aria-label="Dismiss message">×</button>
	`);
	form.before(notification);
	notification.querySelector('.portal-notification__dismiss')?.addEventListener('click', () => notification.remove());
	notification.focus({ preventScroll: true });

	if (autoDismiss) {
		globalThis.setTimeout(() => notification.remove(), 4000);
	}
}

/** Removes background regions from keyboard navigation while the modal is active. */
function setBackgroundInert(isInert: boolean): void {
	queryElements('header, main, footer', isHtmlElement).forEach((region) => {
		if (isInert) {
			region.setAttribute('inert', '');
		} else {
			region.removeAttribute('inert');
		}
	});
}

/** Returns the full original Binocle mascot SVG structure with tubes, barrels and expression layers. */
function mascotSvgMarkup(): string {
	return `
		<svg class="binocle__svg" viewBox="0 0 184 118" role="img" aria-labelledby="binocle-title binocle-desc">
			<title id="binocle-title">Prismatica mascot</title>
			<desc id="binocle-desc">Living binocular mascot with tracking pupils, expressive brows and an animated mouth.</desc>
			<g class="svg-body-group">
				<path class="svg-arm left" d="M49 31 C39 18, 25 18, 19 32" />
				<path class="svg-arm right" d="M135 31 C147 18, 161 19, 166 33" />
				<g class="svg-volume">
					<path class="svg-shell left" d="M15 34 C26 20, 51 16, 69 27 C80 34, 87 48, 86 62 C85 78, 73 90, 55 94 C34 98, 14 90, 7 75 C1 61, 4 45, 15 34Z" />
					<path class="svg-shell right" d="M115 27 C134 16, 158 20, 169 34 C180 49, 183 65, 177 78 C170 92, 150 98, 129 94 C111 90, 99 78, 98 62 C97 48, 104 34, 115 27Z" />
					<ellipse class="svg-back" cx="51" cy="61" rx="39" ry="34" />
					<ellipse class="svg-back" cx="145" cy="61" rx="39" ry="34" />
				</g>
				<path class="svg-barrel left" d="M20 39 C29 28, 47 25, 62 32 C50 29, 33 32, 24 43 C16 54, 16 67, 24 77 C12 69, 9 51, 20 39Z" />
				<path class="svg-barrel right" d="M122 32 C136 25, 154 28, 164 39 C175 51, 172 69, 160 77 C168 67, 168 54, 160 43 C151 32, 134 29, 122 32Z" />
				<ellipse class="svg-frame left-frame" cx="43" cy="57" rx="39" ry="34" />
				<ellipse class="svg-frame right-frame" cx="141" cy="57" rx="39" ry="34" />
				<ellipse class="svg-inner-rim" cx="43" cy="57" rx="28" ry="24" />
				<ellipse class="svg-inner-rim" cx="141" cy="57" rx="28" ry="24" />
				<ellipse class="svg-rim" cx="38" cy="53" rx="24" ry="20" />
				<ellipse class="svg-rim" cx="136" cy="53" rx="24" ry="20" />
				<path class="svg-center-band" d="M84 53 C88 48, 96 48, 100 53" />
				<path class="svg-center-band" d="M86 67 C90 71, 95 71, 99 67" />
				<path class="svg-bridge-shadow" d="M99 62 C103 54, 110 54, 114 62" />
				<path class="svg-bridge" d="M80 61 C84 51, 91 48, 97 52 C101 55, 104 59, 108 62 C110 63, 112 63, 114 62" />
				<path class="svg-detail" d="M16 55 C20 34, 36 24, 56 28" />
				<path class="svg-detail" d="M19 62 C21 76, 35 86, 52 85" />
				<path class="svg-detail" d="M118 28 C139 23, 158 34, 164 55" />
				<path class="svg-detail" d="M162 63 C159 78, 145 86, 129 84" />
				<path class="svg-stitch" d="M28 80 C40 86, 57 85, 67 77" />
				<path class="svg-stitch" d="M123 77 C134 86, 152 85, 162 78" />
				<path class="svg-brow left" d="M22 20 C34 14, 54 14, 66 21" />
				<path class="svg-brow right" d="M118 21 C130 14, 151 14, 163 20" />
				<ellipse class="svg-cheek left" cx="22" cy="68" rx="10" ry="7" />
				<ellipse class="svg-cheek right" cx="162" cy="68" rx="10" ry="7" />
				<path class="svg-sweat" d="M166 32 C173 42, 172 50, 165 53 C158 48, 158 40, 166 32Z" />
				<path class="svg-tear" d="M157 69 C164 79, 163 87, 156 90 C149 85, 150 77, 157 69Z" />
				<g class="svg-stars"><path class="svg-star" d="M23 13 L26 20 L33 21 L28 26 L29 33 L23 29 L17 33 L18 26 L13 21 L20 20Z" /><path class="svg-star" d="M159 10 L162 17 L169 18 L164 23 L165 30 L159 26 L153 30 L154 23 L149 18 L156 17Z" /><path class="svg-star" d="M94 5 L96 11 L102 12 L98 16 L99 22 L94 19 L89 22 L90 16 L86 12 L92 11Z" /></g>
				<path class="svg-spiral left" d="M33 56 C33 48, 47 47, 48 56 C49 66, 36 67, 36 58 C36 53, 43 53, 43 58" />
				<path class="svg-spiral right" d="M131 56 C131 48, 145 47, 146 56 C147 66, 134 67, 134 58 C134 53, 141 53, 141 58" />
				<g class="svg-eye left"><circle class="svg-pupil" cx="43" cy="57" r="11.4" /><circle class="svg-pupil-shine" cx="38.8" cy="52.8" r="2.7" /></g>
				<g class="svg-eye right"><circle class="svg-pupil" cx="141" cy="57" r="11.4" /><circle class="svg-pupil-shine" cx="136.8" cy="52.8" r="2.7" /></g>
				<path class="svg-pupil-heart left" d="M43 52 C43 46, 35 43, 32 50 C29 57, 43 66, 43 66 C43 66, 57 57, 54 50 C51 43, 43 46, 43 52Z" />
				<path class="svg-pupil-heart right" d="M141 52 C141 46, 133 43, 130 50 C127 57, 141 66, 141 66 C141 66, 155 57, 152 50 C149 43, 141 46, 141 52Z" />
				<g class="svg-thought-bubble"><circle cx="14" cy="30" r="2.5" /><circle cx="9" cy="22" r="4" /><circle cx="5" cy="13" r="6" /></g>
				<ellipse class="svg-mouth-pad" cx="92" cy="96" rx="23" ry="15" />
				<path class="svg-mouth smile" d="M76 93 C83 105, 101 105, 108 93" />
				<path class="svg-mouth ajar" d="M78 94 C84 102, 100 102, 106 94 C101 99, 84 99, 78 94Z" />
				<path class="svg-mouth open" d="M77 93 C77 80, 86 73, 93 73 C102 73, 111 81, 110 94 C109 108, 99 115, 91 115 C83 115, 77 107, 77 93Z" />
				<path class="svg-mouth-core" d="M83 95 C83 85, 88 80, 93 80 C100 80, 105 86, 104 96 C103 106, 96 110, 91 110 C85 110, 83 104, 83 95Z" />
				<ellipse class="svg-mouth-shine" cx="88" cy="88" rx="3" ry="2.2" />
				<path class="svg-mouth flat" d="M81 96 C87 98, 98 98, 103 96" />
				<path class="svg-mouth grimace" d="M80 91 C87 89, 98 89, 105 91 L104 101 C97 104, 86 104, 80 101Z" />
				<path class="svg-mouth teeth" d="M80 92 L106 92 M84 92 L84 101 M90 92 L90 102 M96 92 L96 102 M102 92 L102 101" />
				<ellipse class="svg-mouth ooh" cx="92" cy="95" rx="8" ry="10" />
				<path class="svg-mouth tremble" d="M78 96 C82 91, 86 101, 90 96 C94 91, 98 101, 104 95" />
				<path class="svg-mouth smirk" d="M80 97 C84 103, 96 104, 106 95" />
				<path class="svg-mouth silly-open" d="M78 92 C78 80, 86 73, 93 73 C102 73, 110 81, 110 92" />
				<ellipse class="svg-mouth silly-tongue" cx="92" cy="100" rx="9" ry="7" />
				<path class="svg-mouth zip" d="M80 96 L106 96 M84 93 L88 99 M88 93 L92 99 M92 93 L96 99 M96 93 L100 99 M100 93 L104 99" />
				<path class="svg-spark" d="M117 84 L124 78 M119 92 L128 93 M112 91 L106 96" />
			</g>
		</svg>`;
}

/** Keeps the old preparation hook for the classed original SVG. */
function prepareMascotSvg(mascot: HTMLButtonElement): void {
	const svg = mascot.querySelector('.binocle__svg');
	if (!(svg instanceof SVGSVGElement)) {
		return;
	}
	svg.setAttribute('focusable', 'false');
}

/** Reports whether expressive particle animations should be skipped. */
function mascotMotionPaused(): boolean {
	return document.documentElement.classList.contains('motion-paused');
}

/** Removes temporary mascot particle elements and clears their timers. */
function stopMascotEffects(mascot: HTMLButtonElement): void {
	globalThis.clearInterval(mascotState.heartTimer);
	globalThis.clearInterval(mascotState.zTimer);
	globalThis.clearInterval(mascotState.laughTimer);
	mascotState.heartTimer = undefined;
	mascotState.zTimer = undefined;
	mascotState.laughTimer = undefined;
	mascot.querySelectorAll('.binocle__heart, .binocle__z, .binocle__laugh, .binocle__laugh-tear, .binocle__ping').forEach((particle) => particle.remove());
}

/** Adds one floating heart around the mascot. */
function createHeart(mascot: HTMLButtonElement): void {
	const heart = document.createElement('span');
	heart.className = 'binocle__heart';
	heart.textContent = ['♥', '♡', '✦'][Math.floor(Math.random() * 3)] ?? '♥';
	heart.style.left = `${34 + Math.random() * 34}%`;
	heart.style.setProperty('--heart-x', `${Math.random() * 56 - 28}px`);
	mascot.append(heart);
	heart.addEventListener('animationend', () => heart.remove(), { once: true });
}

/** Adds one sleeping Z particle around the mascot. */
function createSleepZ(mascot: HTMLButtonElement): void {
	const zed = document.createElement('span');
	zed.className = 'binocle__z';
	zed.textContent = 'Z';
	zed.style.left = `${54 + Math.random() * 24}%`;
	zed.style.setProperty('--z-x', `${Math.random() * 42 - 14}px`);
	mascot.append(zed);
	zed.addEventListener('animationend', () => zed.remove(), { once: true });
}

/** Adds one silent laugh-tear particle around the mascot. */
function createLaughParticle(mascot: HTMLButtonElement): void {
	const laugh = document.createElement('span');
	laugh.className = 'binocle__laugh-tear';
	laugh.style.left = `${30 + Math.random() * 44}%`;
	laugh.style.top = `${18 + Math.random() * 32}%`;
	laugh.style.setProperty('--laugh-x', `${Math.random() * 60 - 30}px`);
	laugh.style.setProperty('--laugh-rot', `${Math.random() * 34 - 17}deg`);
	mascot.append(laugh);
	laugh.addEventListener('animationend', () => laugh.remove(), { once: true });
}

/** Adds a click/focus ping around the right lens. */
function createPing(mascot: HTMLButtonElement): void {
	const ping = document.createElement('span');
	ping.className = 'binocle__ping';
	ping.style.left = `${48 + Math.random() * 32}%`;
	ping.style.top = `${30 + Math.random() * 30}%`;
	mascot.append(ping);
	ping.addEventListener('animationend', () => ping.remove(), { once: true });
}

/** Replays the original head-star pop without creating text. */
function startMascotStars(mascot: HTMLButtonElement): void {
	if (mascotMotionPaused()) {
		return;
	}
	mascot.classList.remove('is-star-pop');
	mascot.getBoundingClientRect();
	mascot.classList.add('is-star-pop');
	globalThis.setTimeout(() => mascot.classList.remove('is-star-pop'), 1100);
	mascot.querySelectorAll('.svg-star').forEach((star, index) => {
		star.animate([
			{ opacity: 0, transform: 'translateY(4px) scale(0.25) rotate(-20deg)' },
			{ opacity: 1, transform: 'translateY(-7px) scale(1.35) rotate(12deg)' },
			{ opacity: 1, transform: 'translateY(0) scale(1) rotate(0deg)' },
		], { duration: 560, delay: index * 75, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' });
	});
}

/** Pops mascot brows without changing the current mood. */
function liftMascotBrows(mascot: HTMLButtonElement, duration = 680): void {
	mascot.classList.remove('is-brow-pop');
	mascot.getBoundingClientRect();
	mascot.classList.add('is-brow-pop');
	globalThis.setTimeout(() => mascot.classList.remove('is-brow-pop'), duration);
}

/** Starts the particle effect that belongs to a mood. */
function startMascotMoodEffect(mascot: HTMLButtonElement, mood: MascotMood): void {
	if (mascotMotionPaused()) {
		return;
	}
	if (mood === 'love') {
		createHeart(mascot);
		mascotState.heartTimer = globalThis.setInterval(() => createHeart(mascot), 380);
	}
	if (mood === 'excited' || mood === 'happy') {
		startMascotStars(mascot);
	}
	if (mood === 'sleeping') {
		createSleepZ(mascot);
		mascotState.zTimer = globalThis.setInterval(() => createSleepZ(mascot), 720);
	}
	if (mood === 'laughing') {
		createLaughParticle(mascot);
		createLaughParticle(mascot);
		mascotState.laughTimer = globalThis.setInterval(() => createLaughParticle(mascot), 170);
	}
	if (mood === 'surprised' || mood === 'seller') {
		createPing(mascot);
	}
}

/** Restores an awake pose immediately after sleep. */
function wakeMascotPose(mascot: HTMLButtonElement): void {
	mascot.style.setProperty('--blink', '1');
	mascot.style.setProperty('--tilt', '0deg');
	mascotState.targetHeadX = 0;
	mascotState.targetHeadY = 0;
	mascotState.headX *= 0.35;
	mascotState.headY *= 0.35;
}

/** Applies the calm sleeping head tilt immediately. */
function sleepMascotPose(mascot: HTMLButtonElement): void {
	mascot.style.setProperty('--blink', '0.08');
	mascot.style.setProperty('--tilt', '9deg');
	mascotState.targetX = 0;
	mascotState.targetY = 0;
	mascotState.eyeX = 0;
	mascotState.eyeY = 0;
	mascotState.targetHeadX = -7;
	mascotState.targetHeadY = 13;
	mascotState.headX = -7;
	mascotState.headY = 13;
	mascotState.depthX = 7;
	mascotState.depthY = 2;
}

/** Applies a temporary mascot mood that can be overridden after its lock expires. */
function setMascotMood(mascot: HTMLButtonElement, mood: MascotMood, duration = 0, locked = false): void {
	if (mascot.dataset.mood === mood && duration === 0 && !locked) {
		return;
	}
	const previousMood = mascot.dataset.mood;
	globalThis.clearTimeout(mascotState.moodTimer);
	stopMascotEffects(mascot);
	mascot.dataset.mood = mood;
	if (previousMood === 'sleeping' && mood !== 'sleeping') {
		wakeMascotPose(mascot);
	}
	if (mood === 'sleeping') {
		sleepMascotPose(mascot);
	}
	startMascotMoodEffect(mascot, mood);
	if (mood === 'seller') {
		liftMascotBrows(mascot, 520);
	}
	if (locked) {
		mascotState.lockedUntil = Date.now() + duration;
	}
	if (duration > 0) {
		mascotState.moodTimer = globalThis.setTimeout(() => setMascotMood(mascot, 'curious'), duration);
	}
}

/** Detects circular pointer motion and turns it into curious brow movement. */
function updateMascotOrbit(mascot: HTMLButtonElement, angle: number, distance: number): void {
	if (mascotState.lastPointerAngle === undefined || distance <= 68 || distance >= 360) {
		mascotState.orbitTravel *= 0.82;
		mascotState.lastPointerAngle = angle;
		return;
	}
	let delta = angle - mascotState.lastPointerAngle;
	if (delta > Math.PI) {
		delta -= Math.PI * 2;
	} else if (delta < -Math.PI) {
		delta += Math.PI * 2;
	}
	mascotState.orbitTravel = Math.min(Math.PI * 3, mascotState.orbitTravel * 0.92 + Math.abs(delta));
	if (mascotState.orbitTravel > Math.PI * 1.35 && Date.now() - mascotState.lastBrowLift > 680 && Date.now() > mascotState.lockedUntil) {
		setMascotMood(mascot, 'curious', 760, true);
		liftMascotBrows(mascot, 760);
		mascotState.lastBrowLift = Date.now();
		mascotState.orbitTravel = 0;
	}
	mascotState.lastPointerAngle = angle;
}

/** Applies the pointer-derived mascot pose variables. */
function updateMascotPoseFromPointer(mascot: HTMLButtonElement, dx: number, dy: number, closeness: number): void {
	mascotState.targetX = clamp(dx / 36, -7, 7);
	mascotState.targetY = clamp(dy / 42, -4.8, 4.8);
	mascotState.targetHeadX = clamp(dx / 84, -6, 6);
	mascotState.targetHeadY = clamp(-dy / 86, -6, 6);
	mascotState.lastMove = Date.now();
	mascotState.idleMoodShown = false;
	mascot.style.setProperty('--tilt', `${clamp(dx / 140, -3, 3).toFixed(2)}deg`);
	mascot.style.setProperty('--body-roll', `${clamp(dx / 190, -2.2, 2.2).toFixed(2)}deg`);
	mascot.style.setProperty('--body-x', `${clamp(dx / 120, -3.5, 3.5).toFixed(2)}px`);
	mascot.style.setProperty('--body-y', `${clamp(dy / 135, -2.5, 3.5).toFixed(2)}px`);
	mascotState.depthX = 5 - clamp(dx / 85, -4, 4);
	mascotState.depthY = 4 - clamp(dy / 95, -3, 4);
	mascot.style.setProperty('--depth-z', `${(closeness * 16).toFixed(2)}px`);
}

/** Converts the pointer position into gaze, subtle head orientation and mood. */
function updateMascotTarget(mascot: HTMLButtonElement, pointerX: number, pointerY: number): void {
	if (document.body.classList.contains('portal-open')) {
		return;
	}
	const wasSleeping = mascot.dataset.mood === 'sleeping';
	const rect = mascot.getBoundingClientRect();
	const centerX = rect.left + rect.width / 2;
	const centerY = rect.top + rect.height / 2;
	const dx = pointerX - centerX;
	const dy = pointerY - centerY;
	const distance = Math.hypot(dx, dy);
	const closeness = clamp(1 - distance / 520, 0, 1);
	const angle = Math.atan2(dy, dx);
	updateMascotOrbit(mascot, angle, distance);
	updateMascotPoseFromPointer(mascot, dx, dy, closeness);
	if (wasSleeping && Date.now() > mascotState.lockedUntil) {
		setMascotMood(mascot, distance < 180 ? 'gentle' : 'curious', 520, true);
		return;
	}
	if (Date.now() < mascotState.lockedUntil) {
		return;
	}
	if (distance < 92) {
		setMascotMood(mascot, 'close');
	} else if (distance < 170) {
		setMascotMood(mascot, 'gentle');
	} else if (distance < 280) {
		setMascotMood(mascot, 'happy');
	} else if (mascot.dataset.mood !== 'bye') {
		setMascotMood(mascot, 'curious');
	}
}

/** Smooths mascot eye tracking and handles idle personality states. */
function animateMascot(mascot: HTMLButtonElement): void {
	const mood = mascot.dataset.mood;
	const sleeping = mood === 'sleeping';
	if (mood === 'thinking') {
		mascotState.targetX += (-4.4 - mascotState.targetX) * 0.02;
		mascotState.targetY += (-2.8 - mascotState.targetY) * 0.02;
		mascotState.targetHeadX += (-2.2 - mascotState.targetHeadX) * 0.018;
		mascotState.targetHeadY += (1.1 - mascotState.targetHeadY) * 0.018;
	} else if (mood === 'shy') {
		mascotState.targetX += (3.8 - mascotState.targetX) * 0.045;
		mascotState.targetY += (3.1 - mascotState.targetY) * 0.045;
		mascotState.targetHeadX += (1.6 - mascotState.targetHeadX) * 0.03;
		mascotState.targetHeadY += (-0.8 - mascotState.targetHeadY) * 0.03;
	} else if (sleeping) {
		mascotState.targetX += (0 - mascotState.targetX) * 0.08;
		mascotState.targetY += (0 - mascotState.targetY) * 0.08;
		mascotState.targetHeadX += (-7 - mascotState.targetHeadX) * 0.06;
		mascotState.targetHeadY += (13 - mascotState.targetHeadY) * 0.06;
		mascotState.depthX += (7 - mascotState.depthX) * 0.04;
		mascotState.depthY += (2 - mascotState.depthY) * 0.04;
	}
	const speed = sleeping ? 0.09 : 0.16;
	const headSpeed = sleeping ? 0.055 : 0.11;
	mascotState.eyeX += (mascotState.targetX - mascotState.eyeX) * speed;
	mascotState.eyeY += (mascotState.targetY - mascotState.eyeY) * speed;
	mascotState.headX += (mascotState.targetHeadX - mascotState.headX) * headSpeed;
	mascotState.headY += (mascotState.targetHeadY - mascotState.headY) * headSpeed;
	mascot.style.setProperty('--look-x', `${mascotState.eyeX.toFixed(1)}px`);
	mascot.style.setProperty('--look-y', `${mascotState.eyeY.toFixed(1)}px`);
	mascot.style.setProperty('--lean-x', `${mascotState.headX.toFixed(1)}deg`);
	mascot.style.setProperty('--lean-y', `${mascotState.headY.toFixed(1)}deg`);
	mascot.style.setProperty('--parallax-x', `${(mascotState.headX * 0.16).toFixed(1)}px`);
	mascot.style.setProperty('--parallax-y', `${(mascotState.headY * -0.12).toFixed(1)}px`);
	mascot.style.setProperty('--depth-x', `${mascotState.depthX.toFixed(1)}px`);
	mascot.style.setProperty('--depth-y', `${mascotState.depthY.toFixed(1)}px`);
	const idle = Date.now() - mascotState.lastMove;
	if (idle > 3600 && !sleeping && !document.body.classList.contains('portal-open')) {
		mascotState.targetX = Math.sin(Date.now() / 1200) * 2.2;
		mascotState.targetY = Math.cos(Date.now() / 1450) * 1.4;
		mascotState.targetHeadX = Math.sin(Date.now() / 1800) * 0.9;
		mascotState.targetHeadY = Math.cos(Date.now() / 2100) * 0.55;
		mascot.style.setProperty('--tilt', '0deg');
		mascot.style.setProperty('--body-roll', '0deg');
		mascot.style.setProperty('--body-x', '0px');
		mascot.style.setProperty('--body-y', '0px');
		mascotState.depthX += (5 - mascotState.depthX) * 0.08;
		mascotState.depthY += (4 - mascotState.depthY) * 0.08;
		mascot.style.setProperty('--depth-z', '0px');
	}
	if (idle > 75000 && !sleeping && Date.now() > mascotState.lockedUntil) {
		setMascotMood(mascot, 'sleeping');
	} else if (idle > 14000 && !mascotState.idleMoodShown && Date.now() > mascotState.lockedUntil) {
		mascotState.idleMoodShown = true;
		const idleMoods: MascotMood[] = ['thinking', 'shy', 'proud'];
		setMascotMood(mascot, idleMoods[Math.floor(Math.random() * idleMoods.length)] ?? 'thinking', 2200, true);
		liftMascotBrows(mascot);
	}
	mascotState.frame = requestAnimationFrame(() => animateMascot(mascot));
}

/** Starts the blink loop for the classed original SVG eye groups. */
function startMascotBlink(mascot: HTMLButtonElement): void {
	const blink = (): void => {
		const sleeping = mascot.dataset.mood === 'sleeping';
		mascot.style.setProperty('--blink', '0.08');
		if (!sleeping) {
			globalThis.setTimeout(() => mascot.style.setProperty('--blink', '1'), 110);
		}
		globalThis.setTimeout(blink, sleeping ? 1800 + Math.random() * 2400 : 2600 + Math.random() * 3200);
	};
	blink();
}

/** Wires pointer, focus and click interactions to the restored mascot. */
function bindMascotInteractions(mascot: HTMLButtonElement): void {
	prepareMascotSvg(mascot);
	globalThis.addEventListener('pointermove', (event) => updateMascotTarget(mascot, event.clientX, event.clientY), { passive: true });
	mascot.addEventListener('pointerenter', () => setMascotMood(mascot, 'happy', 700));
	mascot.addEventListener('focus', () => setMascotMood(mascot, 'listening', 700));
	mascot.addEventListener('pointerdown', () => {
		setMascotMood(mascot, 'excited', 900, true);
		createPing(mascot);
	});
	mascot.addEventListener('dblclick', () => setMascotMood(mascot, 'love', 1800, true));
	globalThis.addEventListener('scroll', () => {
		if (Date.now() < mascotState.lockedUntil || document.body.classList.contains('portal-open')) {
			return;
		}
		setMascotMood(mascot, 'curious', 700, true);
		liftMascotBrows(mascot, 520);
	}, { passive: true });
	globalThis.addEventListener('blur', () => setMascotMood(mascot, 'bye', 1000, true));
	startMascotBlink(mascot);
	if (mascotState.frame !== undefined) {
		cancelAnimationFrame(mascotState.frame);
	}
	animateMascot(mascot);
}

/** Builds the mascot button markup from the extracted original drawing. */
function characterMarkup(): string {
	return `
		<button class="binocle" type="button" data-mood="curious" aria-label="Open Prismatica portal">
			${mascotSvgMarkup()}
			<span class="right-lens-hotspot" aria-hidden="true"></span>
		</button>`;
}

/** Places the mascot into its header anchor. */
function mountMascot(): void {
	const anchor = queryElement('#mascot-anchor', isHtmlElement);
	if (!anchor) {
		return;
	}
	setTrustedInnerHTML(anchor, characterMarkup());
	const mascot = queryElement('.binocle', isButton);
	if (mascot) {
		bindMascotInteractions(mascot);
		mascot.addEventListener('click', () => openPortal('start'));
	}
}

/** Creates the portal document fragment. */
function createPortalMarkup(mode: PortalMode): string {
	const quick = mode === 'connect';
	return `
		<div id="portal" class="portal portal--${quick ? 'quick' : 'start'}" role="dialog" aria-modal="true" aria-labelledby="portal-title">
			<h2 id="portal-title" class="visually-hidden">Prismatica workspace portal</h2>
			<button class="portal__close" type="button" aria-label="Close portal">×</button>
			<div class="portal__stage" aria-hidden="true"><span></span><span></span><span></span></div>
			<section class="portal__panel portal__panel--login" aria-label="Secure connection panel">
				<div class="portal-login-area">
					<p class="portal-kicker">${quick ? 'Verified sign in' : 'Secure account onboarding'}</p>
					<h2 aria-hidden="true" data-auth-title>${quick ? 'Open your workspace' : 'Create your workspace'}</h2>
					<p class="portal-note" data-auth-note>${quick ? 'Sign in through the protected gateway with anti-abuse checks and rotated refresh cookies.' : 'Create a verified profile that matches the local users schema and activates only after email confirmation.'}</p>
					<div class="portal-trust-row" aria-hidden="true"><span>Turnstile</span><span>HttpOnly refresh</span><span>Email verification</span></div>
					<div class="portal-auth-switch" role="group" aria-label="Authentication mode">
						<button class="portal-auth-switch__button" type="button" data-auth-switch="register" aria-pressed="${quick ? 'false' : 'true'}">Create account</button>
						<button class="portal-auth-switch__button" type="button" data-auth-switch="login" aria-pressed="${quick ? 'true' : 'false'}">Sign in</button>
					</div>
					<form class="portal-login" novalidate>
						<div class="portal-register-only portal-field-grid">
							<div class="field">
								<label for="portal-username">Username <span aria-hidden="true">*</span></label>
								<input id="portal-username" name="username" type="text" autocomplete="username" placeholder="prism-user" minlength="3" maxlength="32" pattern="[a-zA-Z0-9_][a-zA-Z0-9_.-]{2,31}" required />
							</div>
							<div class="field">
								<label for="portal-first-name">First name <span class="optional">optional</span></label>
								<input id="portal-first-name" name="first_name" type="text" autocomplete="given-name" placeholder="Ada" maxlength="80" />
							</div>
							<div class="field">
								<label for="portal-last-name">Last name <span class="optional">optional</span></label>
								<input id="portal-last-name" name="last_name" type="text" autocomplete="family-name" placeholder="Lovelace" maxlength="80" />
							</div>
							<div class="field">
								<label for="portal-theme">Theme</label>
								<select id="portal-theme" name="theme">
									<option value="light">Light</option>
									<option value="dark">Dark</option>
								</select>
							</div>
						</div>
						<div class="field">
							<label for="portal-email">Email <span aria-hidden="true">*</span></label>
							<input id="portal-email" name="email" type="email" autocomplete="email" placeholder="you@example.com" required />
						</div>
						<div class="field portal-register-only">
							<label for="portal-email-confirm">Confirm email <span aria-hidden="true">*</span></label>
							<input id="portal-email-confirm" name="email_confirm" type="email" autocomplete="email" placeholder="you@example.com" required />
						</div>
						<div class="field" data-password-field>
							<label for="portal-password">Password <span aria-hidden="true">*</span></label>
							<input id="portal-password" name="password" type="password" autocomplete="current-password" placeholder="12+ chars, A–z, 0–9, symbol" required />
							<p class="portal-password-hint portal-register-only">Minimum 12 characters with uppercase, lowercase, number and symbol.</p>
							<button class="portal-link portal-link--button portal-login-only" type="button" data-forgot-password>Forgot your password?</button>
						</div>
						<div class="field portal-register-only">
							<label for="portal-password-confirm">Repeat password <span aria-hidden="true">*</span></label>
							<input id="portal-password-confirm" name="password_confirm" type="password" autocomplete="new-password" placeholder="Repeat your password" required />
						</div>
						<div class="portal-register-only portal-field-grid portal-field-grid--optional">
							<div class="field">
								<label for="portal-avatar-url">Avatar URL <span class="optional">optional HTTPS</span></label>
								<input id="portal-avatar-url" name="avatar_url" type="url" inputmode="url" placeholder="https://example.com/avatar.png" maxlength="255" />
							</div>
							<div class="field field--textarea">
								<label for="portal-bio">Bio <span class="optional">optional</span></label>
								<textarea id="portal-bio" name="bio" rows="3" maxlength="280" placeholder="Tell your team what you are building."></textarea>
							</div>
						</div>
						<label class="consent-toggle portal-consent" for="portal-terms-consent">
							<input id="portal-terms-consent" name="terms_consent" type="checkbox" required />
							<span>I have read and accept the <a href="/legal/terms/" target="_blank" rel="noreferrer">Terms of Service</a> and <a href="/legal/privacy-policy/" target="_blank" rel="noreferrer">Privacy Policy</a>.</span>
						</label>
						<label class="consent-toggle portal-consent" for="portal-newsletter-consent">
							<input id="portal-newsletter-consent" name="newsletter_consent" type="checkbox" />
							<span>I agree to receive the Prismatica newsletter. This is optional and has no effect on account access.</span>
						</label>
						<label class="consent-toggle portal-consent" for="portal-notifications-enabled">
							<input id="portal-notifications-enabled" name="notifications_enabled" type="checkbox" checked />
							<span>Enable security and workspace notifications by default.</span>
						</label>
						<p class="portal-verification-note portal-register-only">After submission, open the confirmation email to activate the account before your first sign-in.</p>
						<div class="turnstile-box" data-turnstile-widget aria-label="Anti-abuse verification"></div>
						<input type="hidden" name="turnstile_token" data-turnstile-token />
						<button class="portal-cta" type="submit" data-login-submit>${quick ? 'Sign in securely →' : 'Create protected account →'}</button>
						<div class="portal-recovery-actions" data-recovery-actions hidden>
							<button class="portal-cta" type="submit" data-recovery-submit>Send reset link</button>
							<button class="portal-secondary" type="button" data-cancel-recovery>Back to login</button>
						</div>
						<button class="portal-secondary" type="button" data-close-portal>Return to the tour</button>
						<a class="portal-link" href="#media-assets">Need a preview first?</a>
						<output id="portal-error-msg" class="portal-error" role="status" aria-live="polite" aria-atomic="true"></output>
					</form>
				</div>
			</section>
			<section class="portal__panel portal__panel--preview" aria-label="Future workspace preview">
				<div class="portal-demo-area">
					<div class="portal-brand"><span class="portal-brand__mark">✦</span><span>Prismatica</span></div>
					<p class="portal-kicker portal-kicker--future">Future workspace</p>
					<div class="portal-dashboard" aria-hidden="true">
						<div class="portal-dashboard__top"><span></span><span></span><span></span></div>
						<div class="portal-dashboard__grid"><span></span><span></span><span></span><span></span></div>
					</div>
					<div class="portal-cards">
						<article class="portal-card"><span>01</span><h3>Rules</h3><p>Permissions, views and automations become visible cards.</p></article>
						<article class="portal-card"><span>02</span><h3>Team</h3><p>Collaborators work on notes, dashboards and databases together.</p></article>
						<article class="portal-card"><span>03</span><h3>Universe</h3><p>Every block connects to a broader operating canvas.</p></article>
					</div>
					<p class="portal-quote">One workspace that grows with the way you think.</p>
					<a class="portal-discover" href="#powers">Discover the powers</a>
				</div>
			</section>
		</div>`;
}

/** Returns keyboard-focusable controls inside a container. */
function focusableElements(container: HTMLElement): HTMLElement[] {
	return queryElements('a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])', isHtmlElement).filter((element) => container.contains(element) && element.getAttribute('aria-hidden') !== 'true');
}

/** Installs and returns a removable keyboard focus trap. */
function trapFocus(portal: HTMLElement): () => void {
	const handleKeydown = (event: KeyboardEvent): void => {
		if (event.key !== 'Tab') {
			return;
		}
		const focusable = focusableElements(portal);
		const first = focusable[0];
		const last = focusable.at(-1);
		if (!first || !last) {
			return;
		}
		if (event.shiftKey && document.activeElement === first) {
			event.preventDefault();
			last.focus();
		} else if (!event.shiftKey && document.activeElement === last) {
			event.preventDefault();
			first.focus();
		}
	};
	portal.addEventListener('keydown', handleKeydown);
	return () => portal.removeEventListener('keydown', handleKeydown);
}

type PortalFormElements = {
	error: HTMLOutputElement;
	email: HTMLInputElement;
	confirmEmail: HTMLInputElement | null;
	password: HTMLInputElement;
	confirmPassword: HTMLInputElement | null;
	username: HTMLInputElement | null;
	firstName: HTMLInputElement | null;
	lastName: HTMLInputElement | null;
	avatarUrl: HTMLInputElement | null;
	bio: HTMLTextAreaElement | null;
	theme: HTMLSelectElement | null;
	notificationsEnabled: HTMLInputElement | null;
	termsConsent: HTMLInputElement | null;
	newsletterConsent: HTMLInputElement | null;
	submitButton: HTMLButtonElement | null;
};

/** Returns the typed portal form controls needed by submit handlers. */
function portalFormElements(portal: HTMLElement): PortalFormElements | null {
	const error = portal.querySelector('.portal-error');
	const email = portal.querySelector('#portal-email');
	const confirmEmail = portal.querySelector('#portal-email-confirm');
	const password = portal.querySelector('#portal-password');
	const confirmPassword = portal.querySelector('#portal-password-confirm');
	const username = portal.querySelector('#portal-username');
	const firstName = portal.querySelector('#portal-first-name');
	const lastName = portal.querySelector('#portal-last-name');
	const avatarUrl = portal.querySelector('#portal-avatar-url');
	const bio = portal.querySelector('#portal-bio');
	const theme = portal.querySelector('#portal-theme');
	const notificationsEnabled = portal.querySelector('#portal-notifications-enabled');
	const termsConsent = portal.querySelector('#portal-terms-consent');
	const newsletterConsent = portal.querySelector('#portal-newsletter-consent');
	const submitButton = portal.querySelector('[data-login-submit]');
	if (!(error instanceof HTMLOutputElement) || !(email instanceof HTMLInputElement) || !(password instanceof HTMLInputElement)) {
		return null;
	}
	return {
		error,
		email,
		confirmEmail: confirmEmail instanceof HTMLInputElement ? confirmEmail : null,
		password,
		confirmPassword: confirmPassword instanceof HTMLInputElement ? confirmPassword : null,
		username: username instanceof HTMLInputElement ? username : null,
		firstName: firstName instanceof HTMLInputElement ? firstName : null,
		lastName: lastName instanceof HTMLInputElement ? lastName : null,
		avatarUrl: avatarUrl instanceof HTMLInputElement ? avatarUrl : null,
		bio: bio instanceof HTMLTextAreaElement ? bio : null,
		theme: theme instanceof HTMLSelectElement ? theme : null,
		notificationsEnabled: notificationsEnabled instanceof HTMLInputElement ? notificationsEnabled : null,
		termsConsent: termsConsent instanceof HTMLInputElement ? termsConsent : null,
		newsletterConsent: newsletterConsent instanceof HTMLInputElement ? newsletterConsent : null,
		submitButton: submitButton instanceof HTMLButtonElement ? submitButton : null,
	};
}

/** Clears invalid state from portal controls. */
function clearPortalFieldErrors(...fields: HTMLInputElement[]): void {
	fields.forEach((field) => {
		field.removeAttribute('aria-invalid');
		field.removeAttribute('aria-describedby');
	});
}

/** Marks a portal input as invalid and focuses it. */
function showPortalFieldError(error: HTMLOutputElement, field: HTMLInputElement, message: string): void {
	error.textContent = message;
	field.setAttribute('aria-invalid', 'true');
	field.setAttribute('aria-describedby', 'portal-error-msg');
	field.focus();
}

/** Validates the optional HTTPS avatar URL field. */
function hasValidOptionalHttpsUrl(field: HTMLInputElement | null): boolean {
	if (!field || field.value.trim().length === 0) {
		return true;
	}
	try {
		return new URL(field.value).protocol === 'https:';
	} catch {
		return false;
	}
}

/** Builds the schema-aligned registration profile payload. */
function portalRegistrationProfile(elements: PortalFormElements): RegisterProfile {
	return {
		username: elements.username?.value.trim() ?? '',
		confirmEmail: elements.confirmEmail?.value.trim() ?? '',
		confirmPassword: elements.confirmPassword?.value ?? '',
		firstName: elements.firstName?.value.trim() || undefined,
		lastName: elements.lastName?.value.trim() || undefined,
		avatarUrl: elements.avatarUrl?.value.trim() || undefined,
		bio: elements.bio?.value.trim() || undefined,
		theme: elements.theme?.value === 'dark' ? 'dark' : 'light',
		notificationsEnabled: elements.notificationsEnabled?.checked ?? true,
	};
}

/** Clears invalid states across the dynamic portal auth controls. */
function clearPortalAuthErrors(elements: PortalFormElements): void {
	const optionalFields = [elements.confirmEmail, elements.confirmPassword, elements.username, elements.avatarUrl].filter((field): field is HTMLInputElement => field instanceof HTMLInputElement);
	clearPortalFieldErrors(elements.email, elements.password, ...optionalFields);
}

/** Validates registration-only identity fields. */
function validateRegistrationIdentity(elements: PortalFormElements, isRegister: boolean): boolean {
	const { confirmEmail, email, error, username } = elements;
	const usernamePattern = /^\w[\w.-]{2,31}$/;
	if (isRegister && username && !usernamePattern.test(username.value.trim())) {
		showPortalFieldError(error, username, 'Error: Choose a username with 3–32 letters, numbers, dots, underscores, or hyphens.');
		return false;
	}
	if (!email.validity.valid) {
		showPortalFieldError(error, email, 'Error: Write a valid email address, for example you@example.com.');
		return false;
	}
	if (isRegister && confirmEmail && email.value.trim().toLowerCase() !== confirmEmail.value.trim().toLowerCase()) {
		showPortalFieldError(error, confirmEmail, 'Error: Confirm the same email address so the activation link reaches the right inbox.');
		return false;
	}
	return true;
}

/** Validates login and registration password fields. */
function validatePortalPasswordFields(elements: PortalFormElements, isRegister: boolean): boolean {
	const { confirmPassword, error, password } = elements;
	if (isRegister && !validatePassword(password.value)) {
		showPortalFieldError(error, password, 'Error: Use at least 12 characters with uppercase, lowercase, number and symbol.');
		return false;
	}
	if (isRegister && confirmPassword && password.value !== confirmPassword.value) {
		showPortalFieldError(error, confirmPassword, 'Error: Repeat the same password.');
		return false;
	}
	if (!isRegister && password.value.length === 0) {
		showPortalFieldError(error, password, 'Error: Enter your password.');
		return false;
	}
	return true;
}

/** Validates profile-only fields that mirror optional users schema columns. */
function validatePortalProfileFields(elements: PortalFormElements, isRegister: boolean): boolean {
	const { avatarUrl, error, termsConsent } = elements;
	if (isRegister && avatarUrl && !hasValidOptionalHttpsUrl(avatarUrl)) {
		showPortalFieldError(error, avatarUrl, 'Error: Avatar URL must start with https:// or stay empty.');
		return false;
	}
	if (isRegister && termsConsent && !termsConsent.checked) {
		showPortalFieldError(error, termsConsent, 'Error: Accept the Terms of Service and Privacy Policy to create an account.');
		return false;
	}
	return true;
}

/** Applies a temporary mood to the mounted mascot when it exists. */
function setMountedMascotMood(mood: MascotMood, duration: number): void {
	const mascot = queryElement('.binocle', isButton);
	if (mascot) {
		setMascotMood(mascot, mood, duration, true);
	}
}

/** Handles the password recovery variant of the portal form. */
async function submitPortalRecovery(portal: HTMLElement, elements: PortalFormElements): Promise<void> {
	const { email, error } = elements;
	const turnstileToken = readTurnstileToken(portal);
	clearPortalFieldErrors(email);
	if (!email.validity.valid) {
		showPortalFieldError(error, email, 'Error: Write a valid email address, for example you@example.com.');
		return;
	}
	if (!turnstileToken) {
		error.textContent = 'Error: Complete the anti-abuse check.';
		return;
	}
	const recoverySubmit = portal.querySelector('[data-recovery-submit]');
	setMountedMascotMood('listening', 1600);
	if (recoverySubmit instanceof HTMLButtonElement) {
		recoverySubmit.disabled = true;
		recoverySubmit.textContent = 'Sending…';
	}
	try {
		await requestPasswordRecovery(email.value, turnstileToken);
		showPortalNotification(portal, 'success', 'If an account exists for that email, a reset link has been sent.');
		announce('If an account exists for that email, a reset link has been sent.');
		setMountedMascotMood('happy', 1800);
	} catch {
		showPortalNotification(portal, 'error', 'Network error — please try again later.');
		announce('Network error — please try again later.');
		setMountedMascotMood('scared', 1200);
	} finally {
		if (recoverySubmit instanceof HTMLButtonElement) {
			recoverySubmit.disabled = false;
			recoverySubmit.textContent = 'Send reset link';
		}
	}
}

/** Validates portal auth input and returns the Turnstile token when valid. */
function validatePortalAuth(portal: HTMLElement, elements: PortalFormElements, isRegister: boolean): string | null {
	const turnstileToken = readTurnstileToken(portal);
	clearPortalAuthErrors(elements);
	if (!validateRegistrationIdentity(elements, isRegister) || !validatePortalPasswordFields(elements, isRegister) || !validatePortalProfileFields(elements, isRegister)) {
		return null;
	}
	if (!turnstileToken) {
		elements.error.textContent = 'Error: Complete the anti-abuse check.';
		return null;
	}
	elements.error.textContent = '';
	return turnstileToken;
}

/** Updates the portal submit button busy state. */
function setPortalSubmitBusy(button: HTMLButtonElement | null, busy: boolean, isRegister: boolean): void {
	if (!button) {
		return;
	}
	button.disabled = busy;
	if (busy) {
		button.textContent = isRegister ? 'Creating…' : 'Connecting…';
		return;
	}
	button.textContent = isRegister ? 'Create protected account →' : 'Sign in securely →';
}

/** Handles a validated registration request. */
async function processPortalRegistration(portal: HTMLElement, elements: PortalFormElements, turnstileToken: string): Promise<void> {
	const registered = await registerPortalAccount(elements.email.value, elements.password.value, turnstileToken, portalRegistrationProfile(elements));
	if (registered) {
		showPortalNotification(portal, 'success', 'Account created. Check your email before signing in.', true);
		announce('Account created. Check your email before signing in.');
		setMountedMascotMood('happy', 1800);
		return;
	}
	showPortalNotification(portal, 'error', 'Registration failed. Check the form and try again.');
	announce('Registration failed. Check the form and try again.');
	setMountedMascotMood('scared', 1200);
}

/** Handles a validated login request. */
async function processPortalLogin(portal: HTMLElement, elements: PortalFormElements, turnstileToken: string): Promise<void> {
	const authenticated = await authenticatePortalLogin(elements.email.value, elements.password.value, turnstileToken);
	if (!authenticated) {
		showPortalNotification(portal, 'error', 'Connection failed — please check your credentials.');
		announce('Connection failed — please check your credentials.');
		setMountedMascotMood('scared', 1200);
		return;
	}
	await syncStoredConsents(authenticated.access_token ?? '', elements.email.value);
	if (elements.newsletterConsent?.checked) {
		await callGdprRpc('gdpr_request_newsletter_optin', { email: elements.email.value }, authenticated.access_token).catch(() => undefined);
	}
	showPortalNotification(portal, 'success', 'Successfully connected — welcome back.', true);
	announce('Successfully connected — welcome back.');
	setMountedMascotMood('happy', 1800);
}

/** Handles the standard login variant of the portal form. */
async function submitPortalLogin(portal: HTMLElement, elements: PortalFormElements): Promise<void> {
	const isRegister = portal.dataset.authMode === 'register';
	const turnstileToken = validatePortalAuth(portal, elements, isRegister);
	if (!turnstileToken) {
		return;
	}
	setPortalSubmitBusy(elements.submitButton, true, isRegister);
	try {
		if (isRegister) {
			await processPortalRegistration(portal, elements, turnstileToken);
			return;
		}
		await processPortalLogin(portal, elements, turnstileToken);
	} catch {
		showPortalNotification(portal, 'error', 'Connection failed — please check your credentials.');
		announce('Connection failed — please check your credentials.');
		setMountedMascotMood('scared', 1200);
	} finally {
		setPortalSubmitBusy(elements.submitButton, false, portal.dataset.authMode === 'register');
	}
}

/** Updates portal heading and call-to-action copy for the selected auth mode. */
function syncAuthModeCopy(controls: AuthModeControls, authMode: 'login' | 'register'): void {
	const isLogin = authMode === 'login';
	if (controls.authTitle instanceof HTMLElement) {
		controls.authTitle.textContent = isLogin ? 'Open your workspace' : 'Create your workspace';
	}
	if (controls.authNote instanceof HTMLElement) {
		controls.authNote.textContent = isLogin
			? 'Sign in through the protected gateway with anti-abuse checks and rotated refresh cookies.'
			: 'Create a verified profile that matches the local users schema and activates only after email confirmation.';
	}
	if (controls.submitButton instanceof HTMLButtonElement) {
		controls.submitButton.textContent = isLogin ? 'Sign in securely →' : 'Create protected account →';
		controls.submitButton.disabled = !isLogin && controls.termsConsent instanceof HTMLInputElement && !controls.termsConsent.checked;
	}
}

/** Shows the relevant login or registration controls. */
function syncAuthModeVisibility(portal: HTMLElement, authMode: 'login' | 'register'): void {
	const isLogin = authMode === 'login';
	portal.querySelectorAll('.portal-register-only, .portal-consent').forEach((element) => {
		if (element instanceof HTMLElement) {
			element.hidden = isLogin;
		}
	});
	portal.querySelectorAll('.portal-login-only').forEach((element) => {
		if (element instanceof HTMLElement) {
			element.hidden = !isLogin;
		}
	});
	portal.querySelectorAll('[data-auth-switch]').forEach((button) => {
		if (button instanceof HTMLElement) {
			button.setAttribute('aria-pressed', String(button.dataset.authSwitch === authMode));
		}
	});
}

/** Updates required/autocomplete states for dynamic auth inputs. */
function syncAuthModeInputs(controls: AuthModeControls, authMode: 'login' | 'register'): void {
	const isLogin = authMode === 'login';
	if (controls.email instanceof HTMLInputElement) {
		controls.email.placeholder = isLogin ? 'you@example.com' : 'you@company.com';
	}
	[controls.username, controls.confirmEmail, controls.confirmPassword, controls.termsConsent].forEach((field) => {
		if (field instanceof HTMLInputElement) {
			field.required = !isLogin;
		}
	});
	if (controls.password instanceof HTMLInputElement) {
		controls.password.setAttribute('autocomplete', isLogin ? 'current-password' : 'new-password');
		controls.password.placeholder = isLogin ? 'Your password' : '12+ chars, A–z, 0–9, symbol';
	}
}

/** Closes any active portal. */
function closePortal(): void {
	const portal = queryElement('.portal', isHtmlElement);
	if (!portal) {
		return;
	}
	mascotState.releaseFocusTrap?.();
	mascotState.releaseFocusTrap = null;
	portal.remove();
	document.body.classList.remove('portal-open');
	setBackgroundInert(false);
	announce('Workspace portal closed');
	mascotState.previousFocus?.focus({ preventScroll: true });
	mascotState.previousFocus = null;
}

/** Opens the generated portal. */
function openPortal(mode: PortalMode): void {
	closePortal();
	mascotState.previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
	insertTrustedHTML(document.body, 'beforeend', createPortalMarkup(mode));
	const portal = queryElement('.portal', isHtmlElement);
	if (!portal) {
		return;
	}
	document.body.classList.add('portal-open');
	setBackgroundInert(true);
	announce('Workspace portal opened');
	requestAnimationFrame(() => portal.classList.add('is-revealed'));
	portal.querySelector('.portal__close')?.addEventListener('click', closePortal);
	portal.querySelector('[data-close-portal]')?.addEventListener('click', closePortal);
	mascotState.releaseFocusTrap = trapFocus(portal);
	const initialTermsConsent = portal.querySelector('#portal-terms-consent');
	const initialSubmitButton = portal.querySelector('.portal-cta');
	const authModeControls: AuthModeControls = {
		authTitle: portal.querySelector('[data-auth-title]'),
		authNote: portal.querySelector('[data-auth-note]'),
		submitButton: initialSubmitButton,
		termsConsent: initialTermsConsent,
		email: portal.querySelector('#portal-email'),
		username: portal.querySelector('#portal-username'),
		confirmEmail: portal.querySelector('#portal-email-confirm'),
		password: portal.querySelector('#portal-password'),
		confirmPassword: portal.querySelector('#portal-password-confirm'),
	};
	const setAuthMode = (authMode: 'login' | 'register'): void => {
		portal.dataset.authMode = authMode;
		syncAuthModeCopy(authModeControls, authMode);
		syncAuthModeVisibility(portal, authMode);
		syncAuthModeInputs(authModeControls, authMode);
	};
	if (initialTermsConsent instanceof HTMLInputElement) {
		initialTermsConsent.addEventListener('change', () => {
			if (initialSubmitButton instanceof HTMLButtonElement && portal.dataset.authMode === 'register') {
				initialSubmitButton.disabled = !initialTermsConsent.checked;
			}
			initialTermsConsent.removeAttribute('aria-invalid');
			initialTermsConsent.removeAttribute('aria-describedby');
		});
	}
	portal.querySelectorAll('[data-auth-switch]').forEach((button) => {
		if (button instanceof HTMLElement) {
			button.addEventListener('click', () => setAuthMode(button.dataset.authSwitch === 'login' ? 'login' : 'register'));
		}
	});
	setAuthMode(mode === 'connect' ? 'login' : 'register');
	mountTurnstile(portal);
	const passwordField = portal.querySelector('[data-password-field]');
	const passwordInput = portal.querySelector('#portal-password');
	const forgotPassword = portal.querySelector('[data-forgot-password]');
	const recoveryActions = portal.querySelector('[data-recovery-actions]');
	const cancelRecovery = portal.querySelector('[data-cancel-recovery]');
	const closePortalButton = portal.querySelector('[data-close-portal]');
	const setRecoveryMode = (enabled: boolean): void => {
		portal.dataset.portalMode = enabled ? 'recovery' : 'login';
		if (passwordField instanceof HTMLElement) {
			passwordField.hidden = enabled;
		}
		if (passwordInput instanceof HTMLInputElement) {
			passwordInput.required = !enabled;
			passwordInput.value = enabled ? '' : passwordInput.value;
		}
		if (initialSubmitButton instanceof HTMLButtonElement) {
			initialSubmitButton.hidden = enabled;
		}
		if (recoveryActions instanceof HTMLElement) {
			recoveryActions.hidden = !enabled;
		}
		if (closePortalButton instanceof HTMLElement) {
			closePortalButton.hidden = enabled;
		}
		portal.querySelectorAll('.portal-consent, .portal-register-only').forEach((element) => {
			if (element instanceof HTMLElement) {
				element.hidden = enabled || portal.dataset.authMode === 'login';
			}
		});
		portal.querySelectorAll('.portal-login-only').forEach((element) => {
			if (element instanceof HTMLElement) {
				element.hidden = enabled || portal.dataset.authMode === 'register';
			}
		});
		clearPortalNotification(portal);
		const error = portal.querySelector('.portal-error');
		if (error instanceof HTMLOutputElement) {
			error.textContent = '';
		}
		queryElement('#portal-email', isInput)?.focus();
	};
	if (forgotPassword instanceof HTMLButtonElement) {
		forgotPassword.addEventListener('click', () => setRecoveryMode(true));
	}
	if (cancelRecovery instanceof HTMLButtonElement) {
		cancelRecovery.addEventListener('click', () => setRecoveryMode(false));
	}
	portal.querySelector('.portal-login')?.addEventListener('submit', (event) => {
		event.preventDefault();
		const elements = portalFormElements(portal);
		if (!elements) {
			return;
		}
		clearPortalNotification(portal);
		void (portal.dataset.portalMode === 'recovery' ? submitPortalRecovery(portal, elements) : submitPortalLogin(portal, elements));
	});
	portal.querySelectorAll('input').forEach((field) => {
		field.addEventListener('input', () => {
			if (field instanceof HTMLInputElement && field.validity.valid) {
				field.removeAttribute('aria-invalid');
				field.removeAttribute('aria-describedby');
			}
		});
	});
	queryElement('#portal-email', isInput)?.focus();
}

/** Installs the consent banner controls. */
function bindConsentBanner(): void {
	const banner = queryElement('[data-consent-banner]', isHtmlElement);
	if (!banner) {
		return;
	}
	const form = banner.querySelector('[data-consent-form]');
	const manageButton = banner.querySelector('[data-consent-manage]');
	const acceptAll = banner.querySelector('[data-consent-accept-all]');
	const rejectAll = banner.querySelector('[data-consent-reject-all]');
	const showBanner = (): void => banner.removeAttribute('hidden');
	const hideBanner = (): void => banner.setAttribute('hidden', '');
	const save = (analytics: boolean, newsletter: boolean, marketing: boolean): void => {
		storeConsentPreferences({ analytics, newsletter, marketing });
		hideBanner();
		announce('Consent preferences saved.');
	};

	if (!readConsentPreferences()) {
		showBanner();
	}

	queryElements('[data-manage-cookies]', isButton).forEach((button) => button.addEventListener('click', () => {
		showBanner();
		banner.focus({ preventScroll: false });
	}));

	if (manageButton instanceof HTMLButtonElement && form instanceof HTMLFormElement) {
		manageButton.addEventListener('click', () => {
			const isExpanded = manageButton.getAttribute('aria-expanded') === 'true';
			manageButton.setAttribute('aria-expanded', String(!isExpanded));
			form.hidden = isExpanded;
		});

		form.addEventListener('submit', (event) => {
			event.preventDefault();
			const analytics = form.elements.namedItem('analytics');
			const newsletter = form.elements.namedItem('newsletter');
			const marketing = form.elements.namedItem('marketing');
			save(
				analytics instanceof HTMLInputElement && analytics.checked,
				newsletter instanceof HTMLInputElement && newsletter.checked,
				marketing instanceof HTMLInputElement && marketing.checked,
			);
		});
	}

	acceptAll?.addEventListener('click', () => save(true, true, true));
	rejectAll?.addEventListener('click', () => save(false, false, false));
}

/** Installs newsletter opt-in form handlers. */
function bindNewsletterSignup(): void {
	queryElements('[data-newsletter-signup]', isHtmlElement).forEach((form) => {
		if (!(form instanceof HTMLFormElement)) {
			return;
		}
		form.addEventListener('submit', async (event) => {
			event.preventDefault();
			const email = form.elements.namedItem('email');
			const checkbox = form.elements.namedItem('newsletter_consent');
			const status = form.querySelector('[data-newsletter-status]');
			if (!(email instanceof HTMLInputElement) || !(checkbox instanceof HTMLInputElement) || !(status instanceof HTMLOutputElement)) {
				return;
			}
			if (!email.validity.valid) {
				status.textContent = 'Enter a valid email address.';
				email.focus();
				return;
			}
			if (!checkbox.checked) {
				status.textContent = 'Please tick the newsletter consent box to subscribe.';
				checkbox.focus();
				return;
			}
			const response = await callGdprRpc('gdpr_request_newsletter_optin', { email: email.value }).catch(() => null);
			if (response?.ok) {
				writeStorage(NEWSLETTER_INTENT_KEY, JSON.stringify({ email: email.value, pendingDoubleOptIn: true, policyVersion: POLICY_VERSION, savedAt: new Date().toISOString() }));
				status.textContent = 'Check your inbox to confirm the newsletter subscription.';
			} else {
				status.textContent = 'Could not start the double opt-in request yet; please try again later.';
			}
		});
	});
}

/** Reads a string value from FormData without accepting File object stringification. */
function formDataString(formData: FormData, key: string): string {
	const value = formData.get(key);
	return typeof value === 'string' ? value : '';
}

/** Installs the public data-rights request form. */
function bindDataRightsForm(): void {
	const form = queryElement('[data-gdpr-request-form]', isHtmlElement);
	if (!(form instanceof HTMLFormElement)) {
		return;
	}
	let csrf = readStorage(CSRF_STORAGE_KEY);
	if (!csrf) {
		csrf = crypto.randomUUID();
		writeStorage(CSRF_STORAGE_KEY, csrf);
	}
	const csrfInput = form.querySelector('[data-csrf-token]');
	if (csrfInput instanceof HTMLInputElement) {
		csrfInput.value = csrf;
	}
	form.addEventListener('submit', async (event) => {
		event.preventDefault();
		const status = form.querySelector('[data-gdpr-request-status]');
		const formData = new FormData(form);
		if (!(status instanceof HTMLOutputElement)) {
			return;
		}
		if (formData.get('csrf') !== csrf) {
			status.textContent = 'Security token mismatch. Refresh and try again.';
			return;
		}
		const response = await callGdprRpc('gdpr_submit_request', {
			request_type: formDataString(formData, 'request_type'),
			email: formDataString(formData, 'email'),
			details: { message: formDataString(formData, 'message'), csrf, policyVersion: POLICY_VERSION },
		}).catch(() => null);
		status.textContent = response?.ok ? 'Your request has been recorded. We may contact you to verify identity.' : 'Could not record the request right now.';
	});
}

/** Installs document-level interaction handlers. */
function bindInteractions(): void {
	queryElement('#theme-toggle', isButton)?.addEventListener('click', cycleTheme);
	queryElement('#pause-animations', isButton)?.addEventListener('click', () => applyMotionPreference(!document.documentElement.classList.contains('motion-paused')));
	bindConsentBanner();
	bindNewsletterSignup();
	bindDataRightsForm();
	queryElements('[data-open-portal]', isButton).forEach((button) => button.addEventListener('click', () => openPortal('start')));
	queryElements('[data-open-connect]', isButton).forEach((button) => button.addEventListener('click', () => openPortal('connect')));
	document.addEventListener('keydown', (event) => {
		if (event.key === 'Escape') {
			closePortal();
		}
	});
	window.addEventListener('resize', renderPaperGrain);
}

/** Loads seeded BaaS data into the frontend status card. */
async function mountBaasStatus(): Promise<void> {
	const root = queryElement('[data-baas-status]', isHtmlElement);
	if (!root) {
		return;
	}

	const state = root.querySelector('[data-baas-state]');
	const list = root.querySelector('[data-baas-users]');
	if (!(state instanceof HTMLElement) || !(list instanceof HTMLUListElement)) {
		return;
	}

	try {
		const users = await fetchSeededUsers(3);
		state.textContent = `Connected securely — loaded ${users.length} seeded users.`;
		list.replaceChildren(
			...users.map((user) => {
				const item = document.createElement('li');
				const name = document.createElement('strong');
				const email = document.createElement('span');
				name.textContent = user.username;
				email.textContent = user.email;
				item.append(name, email);
				return item;
			}),
		);
	} catch (error) {
		state.textContent = error instanceof Error ? error.message : 'Unable to reach the BaaS gateway.';
		list.replaceChildren();
	}
}

/** Starts all client-side page behavior. */
function init(): void {
	applyTheme(initialTheme());
	applyMotionPreference(readStorage(MOTION_KEY) === 'true');
	renderPaperGrain();
	mountMascot();
	bindInteractions();
	void mountBaasStatus();
}

init();
