/** جمل عامة ثابتة: نقرأ آخر الجمل اليونانية النشطة، ونكملها بالمحتوى الثابت دون كتابة أو تدوير أسبوعي. */
import { dbConnect } from "./db";
import { defaultLandingSentences } from "./constants";
import { LandingSentence } from "@/models/LandingSentence";
export async function getLandingSentencesSafe() {
  try {
    await dbConnect();
    const saved = await LandingSentence.find({
      language: "greek",
      isActive: true,
    })
      .sort({ createdAt: -1 })
      .limit(4)
      .lean();
    const texts = new Set(saved.map((item) => item.text));
    return [
      ...saved,
      ...defaultLandingSentences.filter((item) => !texts.has(item.text)),
    ].slice(0, 4);
  } catch {
    return defaultLandingSentences;
  }
}
