import redis from "./redis/redis.js"

const WINDOW_MS = 60 * 1000
const MAX_REQUESTS = 30

const rateLimiter = (windowMs = WINDOW_MS, maxRequests = MAX_REQUESTS) => {
    return async (req, res, next) => {
        try {
            const userId = req.user?.userId || req.ip || "anonymous"
            const key = `ratelimit:${userId}:${Math.floor(Date.now() / windowMs)}`

            const current = await redis.incr(key)

            if (current === 1) {
                await redis.pexpire(key, windowMs)
            }

            res.setHeader("X-RateLimit-Limit", maxRequests)
            res.setHeader("X-RateLimit-Remaining", Math.max(0, maxRequests - current))

            if (current > maxRequests) {
                return res.status(429).json({ message: "Too many requests. Please slow down." })
            }

            next()
        } catch (error) {
            console.error("Rate limiter error:", error)
            next()
        }
    }
}

export default rateLimiter
