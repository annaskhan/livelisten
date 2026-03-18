import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

if (!process.env.ANTHROPIC_API_KEY) {
  console.error("ANTHROPIC_API_KEY environment variable is not set");
}

const anthropic = new Anthropic();

// Simple in-memory rate limiter
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 60; // requests per window
const RATE_WINDOW = 60_000; // 1 minute
const MAX_TEXT_LENGTH = 2000;

const VALID_LANGUAGES = new Set([
  "Arabic", "English", "French", "Spanish", "Urdu",
  "Turkish", "Malay", "Indonesian", "Bengali", "Somali",
]);

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  // Clean up expired entries to prevent unbounded map growth
  if (rateLimitMap.size > 1000) {
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

export async function POST(req: NextRequest) {
  // Rate limit by IP
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (isRateLimited(ip)) {
    return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "Translation service not configured." }, { status: 503 });
  }

  try {
    const { text, sourceLang, targetLang, stream, context } = await req.json();

    if (!text || !text.trim()) {
      return NextResponse.json({ translation: "" });
    }

    // Validate input length
    if (text.length > MAX_TEXT_LENGTH) {
      return NextResponse.json({ error: "Text too long. Maximum 2000 characters." }, { status: 400 });
    }

    // Validate language codes
    if (!VALID_LANGUAGES.has(sourceLang) || !VALID_LANGUAGES.has(targetLang)) {
      return NextResponse.json({ error: "Invalid language selection." }, { status: 400 });
    }

    // Strict translation-only system prompt
    const systemPrompt = [
      `You are a live speech translator. Your ONLY job is to translate ${sourceLang} into ${targetLang}.`,
      ``,
      `ABSOLUTE RULES:`,
      `- Output ONLY the translated text. Nothing else.`,
      `- NEVER add notes, commentary, explanations, parenthetical remarks, or meta-observations.`,
      `- NEVER say things like "Note:", "(This phrase...)", "I'm ready to translate", "This text appears to be...", etc.`,
      `- NEVER ask for audio files, more context, or clarification.`,
      `- NEVER describe the text — just translate it.`,
      `- If the text is unclear or garbled, translate what you can understand and skip what you cannot. Do your best.`,
      `- If the text is fragmentary, translate the fragments naturally.`,
      ``,
      `CONTEXT AWARENESS:`,
      `- This is live speech transcription, so the text may contain transcription errors, incomplete sentences, or fragments.`,
      `- The speech may come from religious sermons (khutbah), prayers, lectures, conversations, meetings, or any setting.`,
      `- For Islamic/religious content: use proper English Islamic terminology (e.g., "Allah" not "God", "peace be upon him" for صلى الله عليه وسلم, "SubhanAllah", "Alhamdulillah", "Inna lillahi wa inna ilayhi raji'un", etc.). Preserve religious phrases and honorifics naturally.`,
      `- Translate the meaning faithfully even if the transcription has errors — infer the intended words from context.`,
      `- Treat the text as spoken language, not written text. Be natural and fluent.`,
    ].join("\n");

    // Build messages with prior context for coherence
    const messages: Array<{ role: "user" | "assistant"; content: string }> = [];

    // If we have prior context (previous translations), include it so the model
    // can produce coherent continuations
    if (context && typeof context === "string" && context.trim()) {
      const trimmedContext = context.slice(-1500); // Last 1500 chars of context
      messages.push(
        { role: "user", content: trimmedContext },
        { role: "assistant", content: "[Previous translation context acknowledged]" }
      );
    }

    // The actual text to translate
    messages.push({ role: "user", content: text });

    if (stream) {
      const encoder = new TextEncoder();
      const readable = new ReadableStream({
        async start(controller) {
          try {
            const stream = anthropic.messages.stream({
              model: "claude-haiku-4-5-20251001",
              max_tokens: 512,
              system: systemPrompt,
              messages,
            });

            for await (const event of stream) {
              if (
                event.type === "content_block_delta" &&
                event.delta.type === "text_delta"
              ) {
                controller.enqueue(encoder.encode(event.delta.text));
              }
            }
            controller.close();
          } catch (err) {
            console.error("Stream error:", err);
            controller.error(err);
          }
        },
      });

      return new Response(readable, {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Transfer-Encoding": "chunked",
          "Cache-Control": "no-cache",
        },
      });
    }

    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 512,
      system: systemPrompt,
      messages,
    });

    const translation =
      message.content[0].type === "text" ? message.content[0].text : "";

    return NextResponse.json({ translation });
  } catch (error: unknown) {
    console.error("Translation error:", error);
    const errMsg =
      error instanceof Error ? error.message : "Translation failed";
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}
