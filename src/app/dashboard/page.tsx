/**
 * Protected learning page with links to saved sentences and logout.
 */
import { T } from "@/components/I18nProvider";
import Link from "next/link";
import { DashboardClient } from "@/components/DashboardClient";
import { LogoutButton } from "@/components/LogoutButton";
import { requirePageSession } from "@/lib/auth";
import { APP_NAME } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await requirePageSession("user");

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <span className="brand">{APP_NAME}</span>
        <nav>
          <Link href="/dashboard">
            {" "}
            <T k="Today" />{" "}
          </Link>
          <Link href="/saved">
            {" "}
            <T k="Saved sentences" />{" "}
          </Link>
        </nav>
        <div className="sidebar-footer">
          <span>{session.username}</span>
          <LogoutButton />
        </div>
      </aside>
      <DashboardClient username={session.username} />
    </main>
  );
}
