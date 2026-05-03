import type { AuthSession, User } from '../core/session.js';
import type { HttpClient } from '../core/http.js';
import type { SignInWithPasswordInput } from '../types.js';
export declare class AuthClient {
    private readonly http;
    constructor(http: HttpClient);
    signIn(input: SignInWithPasswordInput): Promise<AuthSession>;
    signInWithPassword(input: SignInWithPasswordInput): Promise<AuthSession>;
    refreshSession(refreshToken?: string): Promise<AuthSession>;
    signOut(): Promise<void>;
    getUser(): Promise<User>;
    user(): Promise<User>;
}
