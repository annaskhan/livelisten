import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const anthropic = new Anthropic();

export async function POST(req: NextRequest) {
  try {
    const { text, sourceLang, targetLang, stream } = await req.json();

    if (!text || !text.trim()) {
      return NextResponse.json({ translation: "" });
    }

    const prompt = `Translate this ${sourceLang} to ${targetLang}. This is from a live spoken sermon/khutbah. Preserve religious tone. Output ONLY the translation, nothing else.

${text}`;

    if (stream) {
      const encoder = new TextEncoder();
      const readable = new ReadableStream({
        async start(controller) {
          try {
            const stream = anthropic.messages.stream({
              model: "claude-haiku-4-5-20251001",
              max_tokens: 512,
              messages: [{ role: "user", content: prompt }],
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
      messages: [{ role: "user", content: prompt }],
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
