import { defaultLandingSentences } from "./constants";
import { dbConnect } from "./db";
import { generateSentences } from "./ai/service";
import { LandingSentence } from "@/models/LandingSentence";
import { WeeklyLandingRotation } from "@/models/WeeklyLandingRotation";

export function getCurrentWeekKey(date = new Date()) {
  const start = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const diff = Number(date) - Number(start);
  const day = Math.floor(diff / 86400000);
  const week = Math.ceil((day + start.getUTCDay() + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

export async function getLandingSentencesSafe() {
  try {
    await dbConnect();
    const weekKey = getCurrentWeekKey();
    const sentences = await LandingSentence.find({
      activeFromWeek: weekKey,
      isActive: true
    })
      .sort({ createdAt: 1 })
      .lean();

    if (sentences.length >= 4) {
      return sentences.map((sentence) => ({
        language: sentence.language,
        text: sentence.text,
        arabicTranslation: sentence.arabicTranslation
      }));
    }

    return await createWeeklyLandingSentences(weekKey);
  } catch {
    return defaultLandingSentences;
  }

  return defaultLandingSentences;
}

async function createWeeklyLandingSentences(weekKey: string) {
  const existingRotation = await WeeklyLandingRotation.findOne({ weekKey });
  if (existingRotation) {
    return defaultLandingSentences;
  }

  const generated = [];
  for (const language of ["german", "english", "greek", "english"] as const) {
    const [sentence] = await generateSentences({
      language,
      topic: "famous useful daily expression",
      level: "Beginner",
      frequency: "most-common",
      count: 1,
      avoid: generated.map((item) => item.text)
    });
    if (sentence) {
      generated.push({
        language,
        text: sentence.text,
        arabicTranslation: sentence.arabicTranslation
      });
    }
  }

  const nextSentences = generated.length >= 4 ? generated : [...defaultLandingSentences];
  await LandingSentence.updateMany({ activeFromWeek: weekKey }, { $set: { isActive: false } });
  await LandingSentence.insertMany(
    nextSentences.slice(0, 4).map((sentence) => ({
      ...sentence,
      activeFromWeek: weekKey,
      isActive: true
    }))
  );
  await WeeklyLandingRotation.create({ weekKey, sourceProvider: generated.length >= 4 ? "ai" : "fallback" });

  return nextSentences;
}
