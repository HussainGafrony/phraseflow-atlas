/**
 * Check the daily allowance, filter duplicates, generate sentences, then commit delivery and allowance usage atomically. Protection does not depend on the UI button state.
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
import { DailyUsage, type DailyUsageDocument } from "@/models/DailyUsage";
import { Sentence, type SentenceDocument } from "@/models/Sentence";
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
  // 1. Load the user's counter and check the daily limit.
  const usage = await getOrCreateDailyUsage(userId, dayKey);

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

  // 2. Generate a full batch that does not repeat earlier deliveries.
  const previousTexts = await getPreviouslyDeliveredTexts(userId);

  // Generate before charging the allowance so provider failures do not consume it.
  // Commit the counter increment and delivery history together in one MongoDB transaction.
  const sentences = await buildUniqueSentences(criteria, count, previousTexts);
  if (sentences.length < count) {
    return {
      status: "empty" as const,
      dayKey,
      remaining: DAILY_SENTENCE_LIMIT - usage.totalDelivered,
      sentences: [],
    };
  }

  // 3. Save the delivery and charge the allowance together.
  const committed = await saveBatchDelivery(
    userId,
    dayKey,
    criteria,
    usage,
    sentences,
  );
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

// Concurrent first requests can both try to create the counter.
async function getOrCreateDailyUsage(userId: string, dayKey: string) {
  // The unique user-and-day index prevents duplicate counters during concurrent first requests.
  try {
    return await DailyUsage.findOneAndUpdate(
      { userId, dayKey },
      { $setOnInsert: { userId, dayKey } },
      { upsert: true, new: true },
    );
  } catch (error) {
    // MongoDB error 11000 means another request created the same unique key.
    if ((error as { code?: number }).code !== 11000) throw error;
    const existing = await DailyUsage.findOne({ userId, dayKey });
    if (!existing) throw error;
    return existing;
  }
}

async function getPreviouslyDeliveredTexts(userId: string) {
  const delivered = await SentenceDelivery.find({ userId })
    .select("sentenceId")
    .lean();
  const deliveredIds = delivered.map((item) => item.sentenceId);
  const avoidSentences = await Sentence.find({ _id: { $in: deliveredIds } })
    .select("text")
    .lean();

  return avoidSentences.map((sentence) => sentence.text);
}

// A transaction either saves both writes or rolls both back. Do not split them.
async function saveBatchDelivery(
  userId: string,
  dayKey: string,
  criteria: SentenceCriteria,
  usage: DailyUsageDocument,
  sentences: SentenceDocument[],
) {
  const dbSession = await mongoose.startSession();
  let committed = false;
  try {
    await dbSession.withTransaction(async () => {
      committed = false;
      const updated = await DailyUsage.findOneAndUpdate(
        {
          _id: usage._id,
          totalDelivered: usage.totalDelivered,
          // Atomic database condition: this request must not exceed the daily limit of 20.
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
      // If another request updated the counter first, return retry so the client reloads the current state.
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
  return committed;
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

  const results: SentenceDocument[] = [];
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
      // Another request may insert the same text after the existence check; the unique index is the final safeguard.
      if (error?.code === 11000) return null;
      throw error;
    });

    if (sentence) results.push(sentence);
  }

  return results;
}
