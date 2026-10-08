import mongoose from "mongoose";
import { FREQUENCIES, LEVELS, TOPICS } from "./constants";
import { dbConnect } from "./db";
import { LearningOption } from "@/models/LearningOption";

export type OptionType = "topic" | "level" | "frequency";

export type LearningOptionView = {
  type: OptionType;
  label: string;
  value: string;
  description?: string;
  order: number;
  isActive: boolean;
};

export const defaultLearningOptions: LearningOptionView[] = [
  ...TOPICS.map((topic, index) => ({
    type: "topic" as const,
    label: topic,
    value: topic,
    order: index,
    isActive: true
  })),
  ...LEVELS.map((level, index) => ({
    type: "level" as const,
    label: level,
    value: level,
    order: index,
    isActive: true
  })),
  ...FREQUENCIES.map((frequency, index) => ({
    type: "frequency" as const,
    label: frequency.label,
    value: frequency.value,
    order: index,
    isActive: true
  }))
];

export function slugifyOption(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u0370-\u03ff\u0600-\u06ff]+/gi, "-")
    .replace(/^-+|-+$/g, "");
}

export async function getLearningOptions() {
  await dbConnect();
  const saved = await LearningOption.find({ isActive: true }).sort({ type: 1, order: 1, label: 1 }).lean();
  const options = saved.length
    ? saved.map((option) => ({
        type: option.type as OptionType,
        label: option.label,
        value: option.value,
        description: option.description,
        order: option.order,
        isActive: option.isActive
      }))
    : defaultLearningOptions;

  return {
    topics: options.filter((option) => option.type === "topic"),
    levels: options.filter((option) => option.type === "level"),
    frequencies: options.filter((option) => option.type === "frequency")
  };
}

export async function replaceLearningOptions(options: LearningOptionView[]) {
  await dbConnect();
  const normalized = options.map((option, index) => ({
    ...option, label: option.label.trim(),
    value: option.value.trim() || slugifyOption(option.label),
    description: option.description?.trim() ?? "", order: option.order ?? index
  }));
  const keys = normalized.map((option) => `${option.type}:${option.value}`);
  if (new Set(keys).size !== keys.length || normalized.some((option) => !option.value)) {
    throw new Error("Learning options must have unique, non-empty values within each list.");
  }
  for (const type of ["topic", "level", "frequency"]) {
    if (!normalized.some((option) => option.type === type && option.isActive)) {
      throw new Error("Each learning list needs at least one active option.");
    }
  }
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      await LearningOption.deleteMany({}, { session });
      await LearningOption.insertMany(normalized, { session });
    });
  } finally { await session.endSession(); }
}
