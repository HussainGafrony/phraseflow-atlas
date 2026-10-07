import { defaultLandingSentences } from "./constants";
import { dbConnect } from "./db";
import { LandingSentence } from "@/models/LandingSentence";

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
  } catch {
    return defaultLandingSentences;
  }

  return defaultLandingSentences;
}
