/**
 * إدارة إعدادات الصوت والتخزين ومفاتيحهما المشفرة؛ POST يولّد ملف اختبار حقيقياً ويحفظه في Blob الخاص.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiSession } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import { encryptSecret } from "@/lib/crypto";
import { jsonError, handleRouteError } from "@/lib/http";
import { generateAudioUrlOnce } from "@/lib/tts";
import { checkRateLimit } from "@/lib/rate-limit";
import { AudioSettings } from "@/models/AudioSettings";
const schema = z.object({
  enabled: z.boolean(),
  baseUrl: z.string().url().startsWith("https://").max(240),
  endpoint: z
    .string()
    .regex(/^\/(?!\/)[a-zA-Z0-9/_-]+$/)
    .max(120),
  model: z.string().min(1).max(120),
  voice: z.string().min(1).max(120),
  apiKey: z.string().max(500).optional(),
  blobToken: z.string().max(500).optional(),
});
export const runtime = "nodejs";
export async function GET() {
  try {
    if (!(await requireApiSession("admin")))
      return jsonError("Unauthorized.", 401);
    await dbConnect();
    const settings = await AudioSettings.findById("audio");
    return NextResponse.json({
      enabled: settings?.enabled ?? false,
      baseUrl: settings?.baseUrl ?? "https://api.openai.com/v1",
      endpoint: settings?.endpoint ?? "/audio/speech",
      model: settings?.model ?? "gpt-4o-mini-tts",
      voice: settings?.voice ?? "alloy",
      hasApiKey: Boolean(settings?.encryptedApiKey),
      hasBlobToken: Boolean(
        settings?.encryptedBlobToken || process.env.BLOB_READ_WRITE_TOKEN,
      ),
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
export async function PUT(request: Request) {
  try {
    if (!(await requireApiSession("admin")))
      return jsonError("Unauthorized.", 401);
    const { apiKey, blobToken, ...settings } = schema.parse(
      await request.json(),
    );
    await dbConnect();
    await AudioSettings.updateOne(
      { _id: "audio" },
      {
        $set: {
          ...settings,
          ...(apiKey ? { encryptedApiKey: encryptSecret(apiKey) } : {}),
          ...(blobToken
            ? { encryptedBlobToken: encryptSecret(blobToken) }
            : {}),
        },
      },
      { upsert: true },
    );
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
export async function POST() {
  try {
    const session = await requireApiSession("admin");
    if (!session) return jsonError("Unauthorized.", 401);
    await dbConnect();
    if (!(await checkRateLimit(`audio-test:${session.userId}`, 5, 60)).allowed)
      return jsonError("Please try again later.", 429);
    const audioUrl = await generateAudioUrlOnce(
      "Hello! Welcome to your daily language practice.",
      "english",
      true,
    );
    return NextResponse.json({ audioUrl });
  } catch (error) {
    return handleRouteError(error);
  }
}
