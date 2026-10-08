/**
 * مجموعات أسبوعية بترجمات عربية جاهزة، تُبدّل دورياً عند عدم توفر مزوّد ذكاء اصطناعي؛ لا تستخدم جملاً وهمية.
 */
import { defaultLandingSentences } from "./constants";
const weeks = [
  defaultLandingSentences,
  [
    {
      language: "english",
      text: "A little progress every day adds up.",
      arabicTranslation: "التقدم القليل كل يوم يتراكم.",
    },
    {
      language: "german",
      text: "Übung macht den Meister.",
      arabicTranslation: "التدريب يصنع الإتقان.",
    },
    {
      language: "greek",
      text: "Καλή αρχή!",
      arabicTranslation: "بداية موفقة!",
    },
    {
      language: "english",
      text: "It is never too late to learn.",
      arabicTranslation: "لم يفت الأوان أبداً للتعلم.",
    },
  ],
  [
    {
      language: "german",
      text: "Schritt für Schritt.",
      arabicTranslation: "خطوة بخطوة.",
    },
    {
      language: "english",
      text: "Could you say that again, please?",
      arabicTranslation: "هل يمكنك قول ذلك مرة أخرى من فضلك؟",
    },
    {
      language: "greek",
      text: "Χαίρομαι που σε γνωρίζω.",
      arabicTranslation: "سعيد بلقائك.",
    },
    {
      language: "english",
      text: "Where is the nearest station?",
      arabicTranslation: "أين أقرب محطة؟",
    },
  ],
];
export function weeklyDefaults(weekKey: string) {
  const index = Math.floor(
    new Date(`${weekKey}T00:00:00Z`).getTime() / 604800000,
  );
  return weeks[((index % weeks.length) + weeks.length) % weeks.length];
}
