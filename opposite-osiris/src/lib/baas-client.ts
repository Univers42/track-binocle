import { baasConfig } from './baas-config';

export type BaaSUser = {
	id: number;
	username: string;
	email: string;
};

const restUrl = (path: string): string => {
	const baseUrl = baasConfig.url.replace(/\/$/, '');
	const normalizedPath = path.startsWith('/') ? path : `/${path}`;
	return `${baseUrl}/rest/v1${normalizedPath}`;
};

const baasHeaders = (): HeadersInit => {
	if (!baasConfig.anonKey) {
		throw new Error('Missing PUBLIC_BAAS_ANON_KEY. Copy opposite-osiris/.env.example to .env.local and set it from mini-baas-infra/.env.');
	}

	return {
		apikey: baasConfig.anonKey,
		Authorization: `Bearer ${baasConfig.anonKey}`,
		Accept: 'application/json',
		'Content-Type': 'application/json',
	};
};

export async function fetchSeededUsers(limit = 3): Promise<BaaSUser[]> {
	const response = await fetch(restUrl(`/users?select=id,username,email&limit=${limit}`), {
		headers: baasHeaders(),
	});

	if (!response.ok) {
		throw new Error(`BaaS users query failed: ${response.status} ${response.statusText}`);
	}

	return response.json() as Promise<BaaSUser[]>;
}
