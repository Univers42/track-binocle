export declare const routes: {
    readonly auth: {
        readonly token: (grantType: "password" | "refresh_token") => string;
        readonly logout: "/auth/v1/logout";
        readonly user: "/auth/v1/user";
    };
    readonly query: {
        readonly execute: "/query/v1/execute";
    };
    readonly storage: {
        readonly sign: (bucket: string, key: string) => string;
    };
    readonly analytics: {
        readonly events: "/analytics/v1/events";
    };
    readonly realtime: {
        readonly channel: (channel: string) => string;
    };
};
