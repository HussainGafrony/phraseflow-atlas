import mongoose from "mongoose";
import {
  DAILY_BATCH_SIZE,
  DAILY_SENTENCE_LIMIT,
  UNLOCK_AFTER_SENTENCES,
  type FrequencyLevel,
  type LearningLanguage,
} from "./constants";
import { createStableHash } from "./crypto";
import { getDayKey } from "./dates";
import { generateSentences } from "./ai/service";
import { generateAudioUrlOnce } from "./tts";
import { DailyUsage } from "@/models/DailyUsage";
import { Sentence } from "@/models/Sentence";
import { SentenceDelivery } from "@/models/SentenceDelivery";

export type SentenceCriteria = {
  language: LearningLanguage;
  topic: string;
  level: string;
  frequency: FrequencyLevel | string;
};

export async function getTodaySentencesForUser(userId: string, criteria: SentenceCriteria) {
  const dayKey = getDayKey();
  const usage = await DailyUsage.findOneAndUpdate(
    { userId, dayKey },
    { $setOnInsert: { userId, dayKey } },
    { upsert: true, new: true }
  );

  if (usage.totalDelivered >= DAILY_SENTENCE_LIMIT) {
    return {
      status: "limit-reached" as const,
      dayKey,
      remaining: 0,
      sentences: []
    };
  }

  if (usage.totalDelivered >= UNLOCK_AFTER_SENTENCES && !usage.unlocked) {
    return {
      status: "unlock-required" as const,
      dayKey,
      remaining: DAILY_SENTENCE_LIMIT - usage.totalDelivered,
      sentences: []
    };
  }

  const phaseLimit = usage.unlocked ? DAILY_SENTENCE_LIMIT : UNLOCK_AFTER_SENTENCES;
  const availableInPhase = phaseLimit - usage.totalDelivered;
  const count = Math.min(DAILY_BATCH_SIZE, availableInPhase, DAILY_SENTENCE_LIMIT - usage.totalDelivered);

  const delivered = await SentenceDelivery.find({ userId }).select("sentenceId").lean();
  const deliveredIds = delivered.map((item) => item.sentenceId);
  const avoidSentences = await Sentence.find({ _id: { $in: deliveredIds } }).select("text").lean();

  const reservedUsage = await DailyUsage.findOneAndUpdate(
    {
      _id: usage._id,
      totalDelivered: usage.totalDelivered,
      unlocked: usage.unlocked
    },
    { $inc: { totalDelivered: count, batchesDelivered: 1 } },
    { new: true }
  );

  if (!reservedUsage) {
    return {
      status: "retry" as const,
      dayKey,
      remaining: Math.max(0, DAILY_SENTENCE_LIMIT - usage.totalDelivered),
      sentences: []
    };
  }

  const sentences = await buildUniqueSentences(criteria, count, avoidSentences.map((item) => item.text));

  if (!sentences.length) {
    await DailyUsage.updateOne(
      { _id: usage._id },
      { $inc: { totalDelivered: -count, batchesDelivered: -1 } }
    );

    return {
      status: "empty" as const,
      dayKey,
      remaining: DAILY_SENTENCE_LIMIT - (reservedUsage.totalDelivered - count),
      sentences: []
    };
  }

  await SentenceDelivery.insertMany(
    sentences.map((sentence) => ({
      userId: new mongoose.Types.ObjectId(userId),
      sentenceId: sentence._id,
      dayKey,
      context: criteria
    })),
    { ordered: false }
  ).catch(() => null);

  if (sentences.length < count) {
    await DailyUsage.updateOne({ _id: usage._id }, { $inc: { totalDelivered: -(count - sentences.length) } });
  }

  return {
    status: "ok" as const,
    dayKey,
    remaining: DAILY_SENTENCE_LIMIT - (reservedUsage.totalDelivered - (count - sentences.length)),
    sentences
  };
}

async function buildUniqueSentences(criteria: SentenceCriteria, count: number, avoid: string[]) {
  const generated = await generateSentences({
    ...criteria,
    count: count + 4,
    avoid
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
    const hash = createStableHash([
      criteria.language,
      criteria.topic,
      criteria.level,
      criteria.frequency,
      candidate.text
    ].join("|"));

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
      audioUrl: await generateAudioUrlOnce(candidate.text, criteria.language)
    });

    results.push(sentence);
  }

  return results;
}
