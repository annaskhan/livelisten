import { NextResponse } from "next/server";

export async function GET() {
  const apiKey = process.env.DEEPGRAM_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "DEEPGRAM_API_KEY not configured" },
      { status: 500 }
    );
  }

  // Return the API key directly for the client to connect to Deepgram
  // In production, you'd want to create a temporary scoped key via the Deepgram API
  return NextResponse.json({ key: apiKey });
}
