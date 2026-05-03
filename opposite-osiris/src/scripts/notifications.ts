export type NotificationKind = 'success' | 'error' | 'warning' | 'info';

export type NotificationOptions = {
	kind: NotificationKind;
	title: string;
	message?: string;
	duration?: number;
	id?: string;
};

type NotificationRecord = {
	id: string;
	element: HTMLElement;
	timer: number | undefined;
};

const DEFAULT_DURATIONS: Record<NotificationKind, number> = {
	success: 4000,
	error: 0,
	warning: 6000,
	info: 5000,
};

const ICONS: Record<NotificationKind, string> = {
	success: '✓',
	error: '✕',
	warning: '⚠',
	info: 'ℹ',
};

const records = new Map<string, NotificationRecord>();
let counter = 0;
let escapeListenerBound = false;

function ensureNotificationRoot(): HTMLElement {
	const existingRoot = document.querySelector('#notification-root');
	if (existingRoot instanceof HTMLElement) {
		if (!escapeListenerBound) {
			document.addEventListener('keydown', (event) => {
				if (event.key !== 'Escape') {
					return;
				}
				const topmost = Array.from(records.values()).at(-1);
				if (topmost) {
					dismissNotification(topmost.id);
				}
			});
			escapeListenerBound = true;
		}
		return existingRoot;
	}
	const root = document.createElement('div');
	root.id = 'notification-root';
	root.className = 'notification-root';
	root.setAttribute('aria-live', 'polite');
	root.setAttribute('aria-atomic', 'false');
	document.body.prepend(root);
	if (!escapeListenerBound) {
		document.addEventListener('keydown', (event) => {
			if (event.key !== 'Escape') {
				return;
			}
			const topmost = Array.from(records.values()).at(-1);
			if (topmost) {
				dismissNotification(topmost.id);
			}
		});
		escapeListenerBound = true;
	}
	return root;
}

function createNotificationId(options: NotificationOptions): string {
	if (options.id) {
		return options.id;
	}
	counter += 1;
	return `notification-${Date.now()}-${counter}`;
}

function createTextElement(tagName: 'p' | 'strong' | 'span', className: string, text: string): HTMLElement {
	const element = document.createElement(tagName);
	element.className = className;
	element.textContent = text;
	return element;
}

function removeRecord(id: string): void {
	const record = records.get(id);
	if (!record) {
		return;
	}
	if (record.timer !== undefined) {
		globalThis.clearTimeout(record.timer);
	}
	records.delete(id);
	record.element.remove();
}

export function dismissNotification(id: string): void {
	const record = records.get(id);
	if (!record) {
		return;
	}
	if (record.timer !== undefined) {
		globalThis.clearTimeout(record.timer);
	}
	record.element.classList.add('notification-card--leaving');
	globalThis.setTimeout(() => removeRecord(id), 180);
}

export function dismissAll(): void {
	Array.from(records.keys()).forEach((id) => dismissNotification(id));
}

export function notify(options: NotificationOptions): void {
	const root = ensureNotificationRoot();
	const id = createNotificationId(options);
	if (records.has(id)) {
		dismissNotification(id);
	}

	const duration = options.duration ?? DEFAULT_DURATIONS[options.kind];
	const card = document.createElement('article');
	card.className = `notification-card notification-card--${options.kind}`;
	card.dataset.notificationId = id;
	card.setAttribute('role', options.kind === 'error' || options.kind === 'warning' ? 'alert' : 'status');
	card.setAttribute('aria-atomic', 'true');

	const icon = createTextElement('span', 'notification-card__icon', ICONS[options.kind]);
	icon.setAttribute('aria-hidden', 'true');

	const body = document.createElement('div');
	body.className = 'notification-card__body';
	body.append(createTextElement('strong', 'notification-card__title', options.title));
	if (options.message) {
		body.append(createTextElement('p', 'notification-card__message', options.message));
	}

	const dismiss = document.createElement('button');
	dismiss.className = 'notification-card__dismiss';
	dismiss.type = 'button';
	dismiss.setAttribute('aria-label', `Dismiss ${options.title}`);
	dismiss.textContent = '×';
	dismiss.addEventListener('click', () => dismissNotification(id));

	card.append(icon, body, dismiss);
	if (duration > 0) {
		const progress = document.createElement('span');
		progress.className = 'notification-card__progress';
		progress.style.setProperty('--notification-duration', `${duration}ms`);
		progress.setAttribute('aria-hidden', 'true');
		card.append(progress);
	}

	root.append(card);
	const timer = duration > 0 ? globalThis.setTimeout(() => dismissNotification(id), duration) : undefined;
	records.set(id, { id, element: card, timer });
}

declare global {
	interface Window {
		PrismaticaNotifications?: {
			notify: typeof notify;
			dismissNotification: typeof dismissNotification;
			dismissAll: typeof dismissAll;
		};
	}
}

if (globalThis.window !== undefined) {
	globalThis.window.PrismaticaNotifications = { notify, dismissNotification, dismissAll };
}
