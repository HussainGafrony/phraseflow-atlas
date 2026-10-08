/**
 * قراءة المواضيع والمستويات والشيوع المحفوظة، مع افتراضيات أول تشغيل. لا توجد صلاحية تعديل من لوحة الأدمن.
 */
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
    isActive: true,
  })),
  ...LEVELS.map((level, index) => ({
    type: "level" as const,
    label: level,
    value: level,
    order: index,
    isActive: true,
  })),
  ...FREQUENCIES.map((frequency, index) => ({
    type: "frequency" as const,
    label: frequency.label,
    value: frequency.value,
    order: index,
    isActive: true,
  })),
];

export async function getLearningOptions(includeInactive = false) {
  await dbConnect();
  const saved = await LearningOption.find(
    includeInactive ? {} : { isActive: true },
  )
    .sort({ type: 1, order: 1, label: 1 })
    .lean();
  const options = saved.length
    ? saved.map((option) => ({
        type: option.type as OptionType,
        label: option.label,
        value: option.value,
        description: option.description,
        order: option.order,
        isActive: option.isActive,
      }))
    : defaultLearningOptions;

  return {
    topics: options.filter((option) => option.type === "topic"),
    levels: options.filter((option) => option.type === "level"),
    frequencies: options.filter((option) => option.type === "frequency"),
  };
}
