export const routes = {
    auth: {
        token: (grantType) => `/auth/v1/token?grant_type=${grantType}`,
        logout: '/auth/v1/logout',
        user: '/auth/v1/user',
    },
    query: {
        execute: '/query/v1/execute',
    },
    storage: {
        sign: (bucket, key) => `/storage/v1/sign/${encodeURIComponent(bucket)}/${encodePath(key)}`,
    },
    analytics: {
        events: '/analytics/v1/events',
    },
    realtime: {
        channel: (channel) => `/realtime/v1/ws/${encodePath(channel)}`,
    },
};
function encodePath(value) {
    return value
        .split('/')
        .filter(Boolean)
        .map((part) => encodeURIComponent(part))
        .join('/');
}
