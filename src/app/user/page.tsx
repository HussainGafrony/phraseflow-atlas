/** Short entry route for users. Session and role checks determine the destination. */
import { requirePageSession } from "@/lib/auth";
import { redirect } from "next/navigation";
export default async function UserEntryPage() {
  await requirePageSession("user");
  redirect("/dashboard");
}
