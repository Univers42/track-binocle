import { AnalyticsClient } from './domains/analytics.js';
import { AuthClient } from './domains/auth.js';
import { QueryClient, ResourceQueryBuilder } from './domains/query.js';
import { StorageClient } from './domains/storage.js';
import { type SessionStorageAdapter } from './core/storage.js';
import type { ClientSession, SessionInput } from './core/session.js';
export type { AuthSession, ClientSession, SessionInput, User, } from './core/session.js';
export type { SessionStorageAdapter } from './core/storage.js';
export { MiniBaasError, MiniBaasTimeoutError } from './core/errors.js';
export type { AnalyticsTrackInput, PresignInput, QueryRunInput, QueryRunResponse, SignInWithPasswordInput, } from './types.js';
export interface RetryOptions {
    attempts?: number;
    delayMs?: number;
    retryOn?: number[];
}
export interface MiniBaasClientOptions {
    url: string;
    anonKey: string;
    fetch?: typeof fetch;
    accessToken?: string;
    refreshToken?: string;
    defaultDatabaseId?: string;
    persistSession?: boolean;
    storage?: SessionStorageAdapter;
    storageKey?: string;
    timeoutMs?: number;
    retry?: number | RetryOptions;
}
export declare class MiniBaasClient {
    readonly auth: AuthClient;
    readonly query: QueryClient;
    readonly storage: StorageClient;
    readonly analytics: AnalyticsClient;
    private readonly http;
    private readonly anonKey;
    constructor(options: MiniBaasClientOptions);
    from<Row = Record<string, unknown>>(resource: string, databaseId?: string): ResourceQueryBuilder<Row>;
    setSession(session: SessionInput): void;
    getSession(): ClientSession | undefined;
    clearSession(): void;
    realtimeUrl(channel?: string): string;
}
export declare function createClient(options: MiniBaasClientOptions): MiniBaasClient;
