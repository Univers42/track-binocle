export const authConfig = {
	gatewayUrl: import.meta.env.PUBLIC_AUTH_GATEWAY_URL ?? '/api/auth',
	turnstileSiteKey: import.meta.env.PUBLIC_TURNSTILE_SITE_KEY ?? '',
	portalUrl: import.meta.env.PUBLIC_PORTAL_URL ?? 'https://portal.example.com/sign-in',
} as const;

export const isTurnstileConfigured = (): boolean => Boolean(authConfig.turnstileSiteKey);
