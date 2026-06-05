import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { imageBase64, mediaType } = await req.json();

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "ANTHROPIC_API_KEY is not set" }, { status: 500 });
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 64,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: { type: "base64", media_type: mediaType, data: imageBase64 },
              },
              {
                type: "text",
                text: 'Analyze this car image and classify how dirty it is. Choose exactly one level: "Clean" (recently washed, minimal dust), "Moderate" (noticeable dirt or grime), or "Very Dirty" (heavy mud, thick dirt, or stains). Respond with ONLY valid JSON and nothing else: {"dirtLevel":"Clean"} or {"dirtLevel":"Moderate"} or {"dirtLevel":"Very Dirty"}',
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return NextResponse.json({ error: `Anthropic API error: ${errText}` }, { status: 500 });
    }

    const aiData = await response.json();
    const rawText = (aiData.content?.[0]?.text ?? "").trim();

    let dirtLevel: "Clean" | "Moderate" | "Very Dirty" = "Moderate";
    try {
      const parsed = JSON.parse(rawText);
      if (["Clean", "Moderate", "Very Dirty"].includes(parsed.dirtLevel)) {
        dirtLevel = parsed.dirtLevel as "Clean" | "Moderate" | "Very Dirty";
      }
    } catch {
      if (rawText.includes("Very Dirty")) dirtLevel = "Very Dirty";
      else if (rawText.includes("Clean")) dirtLevel = "Clean";
    }

    return NextResponse.json({ dirtLevel });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
