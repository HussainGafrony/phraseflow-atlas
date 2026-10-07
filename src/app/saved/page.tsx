import Link from "next/link";
import { LogoutButton } from "@/components/LogoutButton";
import { SavedSentencesClient } from "@/components/SavedSentencesClient";
import { requirePageSession } from "@/lib/auth";
import { APP_NAME } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function SavedPage() {
  const session = await requirePageSession("user");

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <span className="brand">{APP_NAME}</span>
        <nav>
          <Link href="/dashboard">Today</Link>
          <Link href="/saved">Saved sentences</Link>
        </nav>
        <div className="sidebar-footer">
          <span>{session.username}</span>
          <LogoutButton />
        </div>
      </aside>
      <SavedSentencesClient />
    </main>
  );
}
