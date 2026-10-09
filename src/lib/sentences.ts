/**
 * منطق جمل اليوم: فحص الحصة، استبعاد المكرر، التوليد، ثم تسليم الدفعة والخصم بمعاملة ذرية. لا تعتمد الحماية على حالة زر الواجهة.
 */
import mongoose from "mongoose";
import {
  DAILY_BATCH_SIZE,
  DAILY_SENTENCE_LIMIT,
  type FrequencyLevel,
  type LearningLanguage,
} from "./constants";
import { createStableHash } from "./crypto";
import { getDayKey } from "./dates";
import { generateSentences } from "./ai/service";
import { DailyUsage } from "@/models/DailyUsage";
import { Sentence } from "@/models/Sentence";
import { SentenceDelivery } from "@/models/SentenceDelivery";

export type SentenceCriteria = {
  language: LearningLanguage;
  topic: string;
  level: string;
  frequency: FrequencyLevel | string;
};

export async function getTodaySentencesForUser(
  userId: string,
  criteria: SentenceCriteria,
) {
  const dayKey = getDayKey();
  // الفهرس الفريد (المستخدم + اليوم) يمنع إنشاء عدّادين عند أول طلب متزامن.
  const usage = await DailyUsage.findOneAndUpdate(
    { userId, dayKey },
    { $setOnInsert: { userId, dayKey } },
    { upsert: true, new: true },
  ).catch(async (error) => {
    if (error?.code !== 11000) throw error;
    const existing = await DailyUsage.findOne({ userId, dayKey });
    if (!existing) throw error;
    return existing;
  });

  if (usage.totalDelivered >= DAILY_SENTENCE_LIMIT) {
    return {
      status: "limit-reached" as const,
      dayKey,
      remaining: 0,
      sentences: [],
    };
  }

  const count = Math.min(
    DAILY_BATCH_SIZE,
    DAILY_SENTENCE_LIMIT - usage.totalDelivered,
  );

  const delivered = await SentenceDelivery.find({ userId })
    .select("sentenceId")
    .lean();
  const deliveredIds = delivered.map((item) => item.sentenceId);
  const avoidSentences = await Sentence.find({ _id: { $in: deliveredIds } })
    .select("text")
    .lean();

  // نولّد الجمل قبل الخصم: فشل المزوّد لا يستهلك الحصة اليومية.
  // تُحفظ زيادة العداد وسجل التسليم معاً في معاملة MongoDB واحدة.
  const sentences = await buildUniqueSentences(
    criteria,
    count,
    avoidSentences.map((item) => item.text),
  );
  if (sentences.length < count) {
    return {
      status: "empty" as const,
      dayKey,
      remaining: DAILY_SENTENCE_LIMIT - usage.totalDelivered,
      sentences: [],
    };
  }

  const dbSession = await mongoose.startSession();
  let committed = false;
  try {
    await dbSession.withTransaction(async () => {
      committed = false;
      const updated = await DailyUsage.findOneAndUpdate(
        {
          _id: usage._id,
          totalDelivered: usage.totalDelivered,
          // شرط ذرّي داخل قاعدة البيانات: لا يتجاوز الطلب الحد اليومي 20.
          $expr: {
            $lte: [
              { $add: ["$totalDelivered", sentences.length] },
              DAILY_SENTENCE_LIMIT,
            ],
          },
        },
        { $inc: { totalDelivered: sentences.length, batchesDelivered: 1 } },
        { new: true, session: dbSession },
      );
      // إذا سبقنا طلب آخر، نعيد حالة retry ليجلب العميل العداد الصحيح.
      if (!updated) return;
      await SentenceDelivery.insertMany(
        sentences.map((sentence) => ({
          userId: new mongoose.Types.ObjectId(userId),
          sentenceId: sentence._id,
          dayKey,
          context: criteria,
        })),
        { session: dbSession },
      );
      committed = true;
    });
  } finally {
    await dbSession.endSession();
  }
  if (!committed) {
    return {
      status: "retry" as const,
      dayKey,
      remaining: DAILY_SENTENCE_LIMIT - usage.totalDelivered,
      sentences: [],
    };
  }
  const totalDelivered = usage.totalDelivered + sentences.length;
  return {
    status: "ok" as const,
    dayKey,
    remaining: DAILY_SENTENCE_LIMIT - totalDelivered,
    sentences,
  };
}

async function buildUniqueSentences(
  criteria: SentenceCriteria,
  count: number,
  avoid: string[],
) {
  const generated = await generateSentences({
    ...criteria,
    count: count + 4,
    avoid,
  });

  const results = [];
  const seen = new Set(avoid.map((text) => text.trim().toLowerCase()));

  for (const candidate of generated) {
    if (results.length >= count) {
      break;
    }

    const normalizedText = candidate.text.trim().toLowerCase();
    if (seen.has(normalizedText)) {
      continue;
    }

    seen.add(normalizedText);
    const hash = createStableHash(
      [criteria.language, normalizedText].join("|"),
    );

    const existing = await Sentence.findOne({ hash });
    if (existing) {
      continue;
    }

    const sentence = await Sentence.create({
      ...criteria,
      text: candidate.text,
      arabicTranslation: candidate.arabicTranslation,
      sourceProvider: candidate.sourceProvider,
      hash,
    }).catch((error) => {
      // قد يضيف طلب آخر النص نفسه بعد فحص الوجود؛ الفهرس الفريد هو الحكم النهائي.
      if (error?.code === 11000) return null;
      throw error;
    });

    if (sentence) results.push(sentence);
  }

  return results;
}
