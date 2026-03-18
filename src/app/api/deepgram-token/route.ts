import { NextResponse } from "next/server";

// Simple in-memory rate limiter
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 10; // requests per window
const RATE_WINDOW = 60_000; // 1 minute

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  // Clean up expired entries to prevent unbounded map growth
  if (rateLimitMap.size > 500) {
    for (const [key, val] of rateLimitMap) {
      if (now > val.resetAt) rateLimitMap.delete(key);
    }
  }
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW });
    return false;
  }
  entry.count++;
  return entry.count > RATE_LIMIT;
}

export async function GET(req: Request) {
  // Rate limit by IP
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (isRateLimited(ip)) {
    return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
  }

  const apiKey = process.env.DEEPGRAM_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "DEEPGRAM_API_KEY not configured" }, { status: 500 });
  }

  // Create a temporary scoped key via Deepgram API
  try {
    const res = await fetch("https://api.deepgram.com/v1/keys/" + await getProjectId(apiKey) + "/keys", {
      method: "POST",
      headers: { Authorization: `Token ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        comment: "LiveListen temporary key",
        scopes: ["usage:write"],
        time_to_live_in_seconds: 60,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      return NextResponse.json({ key: data.key });
    }

    console.error("Deepgram scoped key API returned status:", res.status);
    return NextResponse.json(
      { error: "Speech recognition temporarily unavailable. Please try browser engine." },
      { status: 503 }
    );
  } catch (err) {
    console.error("Failed to create scoped Deepgram key:", err);
    return NextResponse.json(
      { error: "Speech recognition temporarily unavailable. Please try browser engine." },
      { status: 503 }
    );
  }
}

async function getProjectId(apiKey: string): Promise<string> {
  const res = await fetch("https://api.deepgram.com/v1/projects", {
    headers: { Authorization: `Token ${apiKey}` },
  });
  if (!res.ok) throw new Error("Failed to fetch projects");
  const data = await res.json();
  return data.projects?.[0]?.project_id || "";
}
