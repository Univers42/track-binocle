export const baasConfig = {
	url: import.meta.env.PUBLIC_BAAS_URL ?? 'http://localhost:8000',
	anonKey: import.meta.env.PUBLIC_BAAS_ANON_KEY ?? '',
} as const;

export const isBaasConfigured = (): boolean => Boolean(baasConfig.url && baasConfig.anonKey);
