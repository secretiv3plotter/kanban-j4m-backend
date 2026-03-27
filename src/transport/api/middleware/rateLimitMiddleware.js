const requestBuckets = new Map();

function cleanupExpiredEntries(bucket, now, windowMs) {
    const filtered = bucket.filter(timestamp => now - timestamp < windowMs);
    return filtered;
}

function buildKey(req, keySelector) {
    if (!keySelector) {
        return req.ip;
    }

    return keySelector(req);
}

function createRateLimiter({
    windowMs,
    maxRequests,
    keySelector,
    message = "Too many requests. Please try again later."
}) {
    return (req, res, next) => {
        const key = buildKey(req, keySelector);

        if (!key) {
            return next();
        }

        const now = Date.now();
        const bucketKey = `${req.baseUrl}:${req.path}:${key}`;
        const existingBucket = requestBuckets.get(bucketKey) || [];
        const activeBucket = cleanupExpiredEntries(existingBucket, now, windowMs);

        if (activeBucket.length >= maxRequests) {
            const retryAfterSeconds = Math.ceil((windowMs - (now - activeBucket[0])) / 1000);
            res.set("Retry-After", String(retryAfterSeconds));

            return res.status(429).json({
                message
            });
        }

        activeBucket.push(now);
        requestBuckets.set(bucketKey, activeBucket);

        next();
    };
}

const authIpRateLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000,
    maxRequests: 30,
    message: "Too many authentication requests from this IP. Please try again later."
});

const authIdentityRateLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000,
    maxRequests: 10,
    keySelector: req => {
        const identifier = req.body?.identifier || req.body?.email || req.body?.username;
        return identifier ? String(identifier).trim().toLowerCase() : null;
    },
    message: "Too many attempts for this account. Please try again later."
});

const tasksRateLimiter = createRateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 120,
    message: "Too many task requests. Please slow down."
});

module.exports = {
    authIdentityRateLimiter,
    authIpRateLimiter,
    createRateLimiter,
    tasksRateLimiter
};
