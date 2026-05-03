import { routes } from '../core/routes.js';
export class AuthClient {
    http;
    constructor(http) {
        this.http = http;
    }
    async signIn(input) {
        return this.signInWithPassword(input);
    }
    async signInWithPassword(input) {
        const session = await this.http.request(routes.auth.token('password'), {
            method: 'POST',
            body: input,
            auth: false,
        });
        this.http.setSession(session);
        return session;
    }
    async refreshSession(refreshToken) {
        const token = refreshToken ?? this.http.getSession()?.refreshToken;
        if (!token)
            throw new Error('No refresh token available');
        const session = await this.http.request(routes.auth.token('refresh_token'), {
            method: 'POST',
            body: { refresh_token: token },
            auth: false,
        });
        this.http.setSession(session);
        return session;
    }
    async signOut() {
        await this.http.request(routes.auth.logout, { method: 'POST' });
        this.http.clearSession();
    }
    async getUser() {
        return this.http.request(routes.auth.user);
    }
    async user() {
        return this.getUser();
    }
}
