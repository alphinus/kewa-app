/**
 * Rate Limiting Utility
 * Uses Upstash Redis for serverless-compatible distributed rate limiting
 * Gracefully disables when Redis is not configured
 */
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const isRedisConfigured =
  !!process.env.UPSTASH_REDIS_REST_URL && !!process.env.UPSTASH_REDIS_REST_TOKEN;

let authRateLimiter: Ratelimit | null = null;

if (isRedisConfigured) {
  const redis = Redis.fromEnv();
  authRateLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, "60 s"),
    analytics: true,
    prefix: "kewa:ratelimit:auth",
  });
}

export { authRateLimiter };

/**
 * Check rate limit for an identifier (typically IP address)
 * Returns a 429 response if rate limited, null if allowed
 * Returns null (allow) when Redis is not configured
 */
export async function checkRateLimit(
  request: NextRequest
): Promise<NextResponse | null> {
  if (!authRateLimiter) return null;

  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || "unknown";

  const { success, limit, remaining, reset } = await authRateLimiter.limit(ip);

  if (!success) {
    return NextResponse.json(
      { error: "Zu viele Anfragen. Bitte warten Sie." },
      {
        status: 429,
        headers: {
          "X-RateLimit-Limit": String(limit),
          "X-RateLimit-Remaining": String(remaining),
          "X-RateLimit-Reset": String(reset),
        },
      }
    );
  }

  return null;
}
