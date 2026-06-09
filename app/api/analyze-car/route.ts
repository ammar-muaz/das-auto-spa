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
        model: "claude-sonnet-4-6",
        max_tokens: 100,
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
                text: `You are analyzing an image for a car wash booking system.

Step 1 — Is there a car in this image? Any vehicle (sedan, SUV, truck, van, motorcycle) counts. If no vehicle is visible, respond ONLY with: {"isCar":false}

Step 2 — If a car IS visible, assess the cleanliness of the car's exterior body panels ONLY (doors, hood, roof, bumpers, windows). Ignore dirt on roads, surroundings, or background. Choose exactly one level:
- "Clean": recently washed or minimal dust/water spots only
- "Moderate": noticeable dirt, dust, or grime covering body panels
- "Very Dirty": heavy mud, thick dirt layers, or prominent stains on body panels

Respond with ONLY valid JSON, nothing else:
{"isCar":true,"dirtLevel":"Clean"} or {"isCar":true,"dirtLevel":"Moderate"} or {"isCar":true,"dirtLevel":"Very Dirty"}`,
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

    let isCar = true;
    let dirtLevel: "Clean" | "Moderate" | "Very Dirty" = "Moderate";

    try {
      const parsed = JSON.parse(rawText);
      if (parsed.isCar === false) {
        return NextResponse.json({ isCar: false });
      }
      if (["Clean", "Moderate", "Very Dirty"].includes(parsed.dirtLevel)) {
        dirtLevel = parsed.dirtLevel as "Clean" | "Moderate" | "Very Dirty";
      }
    } catch {
      if (rawText.includes("false")) {
        return NextResponse.json({ isCar: false });
      }
      if (rawText.includes("Very Dirty")) dirtLevel = "Very Dirty";
      else if (rawText.includes("Clean")) dirtLevel = "Clean";
    }

    return NextResponse.json({ isCar, dirtLevel });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
