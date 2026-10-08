/** رابط مختصر لبوابة المستخدم؛ حماية الجلسة تحدد وجهة المستخدم أو الأدمن. */
import { requirePageSession } from "@/lib/auth";
import { redirect } from "next/navigation";
export default async function UserEntryPage() {
  await requirePageSession("user");
  redirect("/dashboard");
}
