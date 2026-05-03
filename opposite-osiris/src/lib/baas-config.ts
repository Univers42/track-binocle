export const baasConfig = {
        get url() {
                const envUrl = import.meta.env.PUBLIC_BAAS_URL ?? '/api';
                                const normalized = envUrl.replaceAll(/\/$/g, '');
                                if (globalThis.window === undefined) return normalized;
                if ((globalThis.location.hostname === 'localhost' || globalThis.location.hostname === '127.0.0.1') &&
                    (normalized === 'http://localhost:8000' || normalized === 'http://127.0.0.1:8000')) {
                        return '/api';
                }
                return normalized;
        },
        get anonKey() {
                return import.meta.env.PUBLIC_BAAS_ANON_KEY ?? '';
        }
};

export const isBaasConfigured = (): boolean => Boolean(baasConfig.url && baasConfig.anonKey);
