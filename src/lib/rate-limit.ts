/**
 * Rate Limiting Utility
 * Uses Upstash Redis for serverless-compatible distributed rate limiting
 * Phase: 30-security-audit-cve-patching
 */
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Initialize Redis client from environment variables
// Requires: UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN
const redis = Redis.fromEnv();

// Auth rate limiter: 10 requests per 60 seconds sliding window
export const authRateLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, "60 s"),
  analytics: true,
  prefix: "kewa:ratelimit:auth",
});

/**
 * Check rate limit for an identifier (typically IP address)
 * Returns a 429 response if rate limited, null if allowed
 */
export async function checkRateLimit(
  request: NextRequest
): Promise<NextResponse | null> {
  // Extract IP from x-forwarded-for or fallback to unknown
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

  return null; // Not rate limited, proceed with request
}
