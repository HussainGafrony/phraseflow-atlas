/**
 * تقديم الملف الصوتي الخاص بعد التحقق من الجلسة ووجود الجملة في تاريخ المستخدم. مفتاح التخزين لا يصل للمتصفح.
 */
import { get } from "@vercel/blob";
import { requireApiSession } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import { jsonError, handleRouteError } from "@/lib/http";
import { getAudioCredentials } from "@/lib/tts";
import { AudioAsset } from "@/models/AudioAsset";
import { Sentence } from "@/models/Sentence";
import { SentenceDelivery } from "@/models/SentenceDelivery";
export const runtime = "nodejs";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ key: string }> },
) {
  try {
    const session = await requireApiSession("user");
    if (!session) return jsonError("Unauthorized.", 401);
    const { key } = await params;
    if (!/^[a-f0-9]{64}$/.test(key)) return jsonError("Not found.", 404);
    await dbConnect();
    {
      const sentences = await Sentence.find({ audioUrl: `/api/audio/${key}` })
        .select("_id")
        .lean();
      if (
        !(await SentenceDelivery.exists({
          userId: session.userId,
          sentenceId: { $in: sentences.map((item) => item._id) },
        }))
      )
        return jsonError("Not found.", 404);
    }
    const asset = await AudioAsset.findOne({ key, state: "ready" });
    if (!asset) return jsonError("Not found.", 404);
    const { token } = await getAudioCredentials();
    const result = await get(asset.blobPath, { access: "private", token });
    if (!result || result.statusCode !== 200)
      return jsonError("Not found.", 404);
    return new Response(result.stream, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
