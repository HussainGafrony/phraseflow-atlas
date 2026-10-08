/**
 * تبديل جمل الصفحة العامة كل أسبوع: قفل مؤقت يمنع التكرار، ومعاملة تحفظ المجموعة كاملة. تعديل الأدمن يتقدم على التوليد التلقائي.
 */
import mongoose from "mongoose";
import { dbConnect } from "./db";
import { getDayKey } from "./dates";
import { generateSentences } from "./ai/service";
import { weeklyDefaults } from "./weekly-defaults";
import { LandingSentence } from "@/models/LandingSentence";
import { WeeklyLandingRotation } from "@/models/WeeklyLandingRotation";
export function getCurrentWeekKey(date = new Date()) {
  const local = new Date(`${getDayKey(date)}T00:00:00Z`);
  local.setUTCDate(local.getUTCDate() - ((local.getUTCDay() + 6) % 7));
  return local.toISOString().slice(0, 10);
}
export async function getLandingSentencesSafe() {
  const weekKey = getCurrentWeekKey();
  try {
    await dbConnect();
    const sentences = await LandingSentence.find({
      activeFromWeek: weekKey,
      isActive: true,
    })
      .sort({ createdAt: 1 })
      .lean();
    if (sentences.length >= 4) return sentences;
    return await rotateWeeklyLanding(weekKey);
  } catch {
    return weeklyDefaults(weekKey);
  }
}
export async function rotateWeeklyLanding(
  weekKey = getCurrentWeekKey(),
  useAI = false,
) {
  await dbConnect();
  try {
    await WeeklyLandingRotation.updateOne(
      { weekKey },
      { $setOnInsert: { weekKey, sourceProvider: "pending" } },
      { upsert: true },
    );
  } catch (error) {
    if ((error as { code?: number }).code !== 11000) throw error;
  }
  const lease = new Date(Date.now() + 240000);
  const lock = await WeeklyLandingRotation.findOneAndUpdate(
    {
      weekKey,
      sourceProvider: "pending",
      $or: [
        { leaseUntil: { $exists: false } },
        { leaseUntil: { $lt: new Date() } },
      ],
    },
    { $set: { leaseUntil: lease } },
    { new: true },
  );
  if (!lock) {
    const current = await LandingSentence.find({
      activeFromWeek: weekKey,
      isActive: true,
    })
      .sort({ createdAt: 1 })
      .lean();
    return current.length >= 4 ? current : weeklyDefaults(weekKey);
  }
  let sentences = weeklyDefaults(weekKey);
  let sourceProvider = "curated";
  if (useAI) {
    try {
      const generated = [];
      for (const language of [
        "german",
        "english",
        "greek",
        "english",
      ] as const) {
        const [sentence] = await generateSentences({
          language,
          topic: "famous useful daily expression",
          level: "A1",
          frequency: "most-common",
          count: 1,
          avoid: generated.map((item) => item.text),
        });
        if (!sentence) throw new Error("Incomplete weekly set");
        generated.push({
          language,
          text: sentence.text,
          arabicTranslation: sentence.arabicTranslation,
        });
      }
      sentences = generated;
      sourceProvider = "ai";
    } catch {
      /* The curated rotation also works without paid AI credentials. */
    }
  }
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const updated = await WeeklyLandingRotation.updateOne(
        { weekKey, sourceProvider: "pending", leaseUntil: lease },
        { $set: { sourceProvider }, $unset: { leaseUntil: 1 } },
        { session },
      );
      if (!updated.modifiedCount) return; // An admin edit takes precedence.
      await LandingSentence.updateMany(
        { activeFromWeek: weekKey },
        { $set: { isActive: false } },
        { session },
      );
      await LandingSentence.insertMany(
        sentences.map((sentence) => ({
          ...sentence,
          activeFromWeek: weekKey,
          isActive: true,
        })),
        { session },
      );
    });
  } finally {
    await session.endSession();
  }
  const current = await LandingSentence.find({
    activeFromWeek: weekKey,
    isActive: true,
  })
    .sort({ createdAt: 1 })
    .lean();
  return current.length >= 4 ? current : sentences;
}
