/**
 * توليد صوت لجملة من تاريخ المستخدم بعد التحقق من ملكيتها؛ إعادة استخدام الرابط الموجود قبل استهلاك حد التوليد.
 */
import { NextResponse } from "next/server";
import { requireApiSession } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import { jsonError, handleRouteError } from "@/lib/http";
import { generateAudioUrlOnce } from "@/lib/tts";
import { checkRateLimit } from "@/lib/rate-limit";
import { saveSentenceSchema } from "@/lib/validators";
import { Sentence } from "@/models/Sentence";
import { SentenceDelivery } from "@/models/SentenceDelivery";
export const runtime = "nodejs";
export const maxDuration = 120;
export async function POST(request: Request) {
  try {
    const session = await requireApiSession("user");
    if (!session) return jsonError("Unauthorized.", 401);
    const { sentenceId } = saveSentenceSchema.parse(await request.json());
    await dbConnect();
    if (
      !(await SentenceDelivery.exists({ userId: session.userId, sentenceId }))
    )
      return jsonError("Not found.", 404);
    const sentence = await Sentence.findById(sentenceId);
    if (!sentence) return jsonError("Not found.", 404);
    if (sentence.audioUrl)
      return NextResponse.json({ audioUrl: sentence.audioUrl });
    if (!(await checkRateLimit(`audio:${session.userId}`, 20, 60)).allowed)
      return jsonError("Please try again later.", 429);
    const audioUrl = await generateAudioUrlOnce(
      sentence.text,
      sentence.language,
      true,
    );
    await Sentence.updateOne(
      { _id: sentence._id, audioUrl: { $in: ["", null] } },
      { $set: { audioUrl } },
    );
    return NextResponse.json({ audioUrl });
  } catch (error) {
    return handleRouteError(error);
  }
}
