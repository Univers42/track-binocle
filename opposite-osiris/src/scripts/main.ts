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

const THEME_KEY = 'prismatica-theme';
const MOTION_KEY = 'prismatica-motion-paused';
const THEMES: ThemeName[] = ['light', 'dark', 'night'];
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
	anchor.innerHTML = characterMarkup();
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
					<p class="portal-kicker">${quick ? 'Quick login' : 'Secure workspace access'}</p>
					<h2 aria-hidden="true">${quick ? 'Open your workspace' : 'Connect to Prismatica'}</h2>
					<p class="portal-note">A calm, protected entry point for notes, teams, automations and data spaces.</p>
					<div class="portal-trust-row" aria-hidden="true"><span>SSO ready</span><span>Encrypted</span><span>WCAG aware</span></div>
					<form class="portal-login" novalidate>
						<div class="field">
							<label for="portal-email">Email</label>
							<input id="portal-email" name="email" type="email" autocomplete="email" placeholder="you@example.com" required />
						</div>
						<div class="field">
							<label for="portal-password">Password</label>
							<input id="portal-password" name="password" type="password" autocomplete="current-password" placeholder="••••••••" required minlength="6" />
						</div>
						<button class="portal-cta" type="submit">Enter secure workspace →</button>
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
	document.body.insertAdjacentHTML('beforeend', createPortalMarkup(mode));
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
	portal.querySelector('.portal-login')?.addEventListener('submit', (event) => {
		event.preventDefault();
		const error = portal.querySelector('.portal-error');
		const email = portal.querySelector('#portal-email');
		const password = portal.querySelector('#portal-password');
		if (!(error instanceof HTMLOutputElement) || !(email instanceof HTMLInputElement) || !(password instanceof HTMLInputElement)) {
			return;
		}
		[email, password].forEach((field) => {
			field.removeAttribute('aria-invalid');
			field.removeAttribute('aria-describedby');
		});
		if (!email.validity.valid) {
			error.textContent = 'Error: Write a valid email address, for example you@example.com.';
			email.setAttribute('aria-invalid', 'true');
			email.setAttribute('aria-describedby', 'portal-error-msg');
			email.focus();
			return;
		}
		if (!password.validity.valid) {
			error.textContent = 'Error: Use at least 6 characters for the password.';
			password.setAttribute('aria-invalid', 'true');
			password.setAttribute('aria-describedby', 'portal-error-msg');
			password.focus();
			return;
		}
		error.textContent = 'Success: welcome sketch saved — demo login accepted.';
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

/** Installs document-level interaction handlers. */
function bindInteractions(): void {
	queryElement('#theme-toggle', isButton)?.addEventListener('click', cycleTheme);
	queryElement('#pause-animations', isButton)?.addEventListener('click', () => applyMotionPreference(!document.documentElement.classList.contains('motion-paused')));
	queryElements('[data-open-portal]', isButton).forEach((button) => button.addEventListener('click', () => openPortal('start')));
	queryElements('[data-open-connect]', isButton).forEach((button) => button.addEventListener('click', () => openPortal('connect')));
	document.addEventListener('keydown', (event) => {
		if (event.key === 'Escape') {
			closePortal();
		}
	});
	window.addEventListener('resize', renderPaperGrain);
}

/** Starts all client-side page behavior. */
function init(): void {
	applyTheme(initialTheme());
	applyMotionPreference(readStorage(MOTION_KEY) === 'true');
	renderPaperGrain();
	mountMascot();
	bindInteractions();
}

init();
