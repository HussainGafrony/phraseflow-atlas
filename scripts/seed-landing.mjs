import mongoose from "mongoose";

const { MONGODB_URI } = process.env;

if (!MONGODB_URI) {
  console.error("Set MONGODB_URI before running this script.");
  process.exit(1);
}

const landingSentenceSchema = new mongoose.Schema(
  {
    language: { type: String, required: true },
    text: { type: String, required: true },
    arabicTranslation: { type: String, required: true },
    activeFromWeek: { type: String, required: true, index: true },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

const LandingSentence =
  mongoose.models.LandingSentence ?? mongoose.model("LandingSentence", landingSentenceSchema);

function getCurrentWeekKey(date = new Date()) {
  const start = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const diff = Number(date) - Number(start);
  const day = Math.floor(diff / 86400000);
  const week = Math.ceil((day + start.getUTCDay() + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

const sentences = [
  {
    language: "german",
    text: "Guten Morgen! Wie geht es dir heute?",
    arabicTranslation: "صباح الخير! كيف حالك اليوم؟"
  },
  {
    language: "english",
    text: "Small steps every day make a big difference.",
    arabicTranslation: "خطوات صغيرة كل يوم تصنع فرقا كبيرا."
  },
  {
    language: "greek",
    text: "Καλησπέρα! Χαίρομαι που σε βλέπω.",
    arabicTranslation: "مساء الخير! سعيد برؤيتك."
  },
  {
    language: "english",
    text: "I learn something useful every day.",
    arabicTranslation: "أنا أتعلم شيئا مفيدا كل يوم."
  }
];

await mongoose.connect(MONGODB_URI);

const weekKey = getCurrentWeekKey();
await LandingSentence.updateMany({ activeFromWeek: weekKey }, { $set: { isActive: false } });
await LandingSentence.insertMany(sentences.map((sentence) => ({ ...sentence, activeFromWeek: weekKey })));

await mongoose.disconnect();
console.log(`Landing sentences seeded for ${weekKey}`);
