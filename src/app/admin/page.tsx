/**
 * Protected page for environment or MongoDB administrators, providing account creation.
 */
import { T } from "@/components/I18nProvider";
import { AdminPanel } from "@/components/AdminPanel";
import { LogoutButton } from "@/components/LogoutButton";
import { requirePageSession } from "@/lib/auth";
import { APP_NAME } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await requirePageSession("admin");

  return (
    <main className="admin-shell">
      <header className="admin-header">
        <div>
          <span className="brand">{APP_NAME}</span>
          <h1>
            {" "}
            <T k="Admin panel" />{" "}
          </h1>
        </div>
        <div className="admin-user">
          <span>{session.username}</span>
          <LogoutButton />
        </div>
      </header>
      <AdminPanel />
    </main>
  );
}
