/**
 * Separate administrator login supporting both environment credentials and MongoDB admin accounts.
 */
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { LoginForm } from "@/components/LoginForm";
import { T } from "@/components/I18nProvider";

export default async function AdminLoginPage() {
  // Use the current session to choose the destination; never trust a redirectTo query parameter.
  const session = await getSession();
  if (session) redirect(session.role === "admin" ? "/admin" : "/dashboard");
  return (
    <main className="auth-page admin-auth">
      <section className="auth-card">
        <Link className="back-link" href="/">
          <T k="backHome" />
        </Link>
        <h1>
          <T k="adminLogin" />
        </h1>
        <p>
          {" "}
          <T k="This direct link opens the admin area only." />{" "}
        </p>
        <LoginForm expectedRole="admin" buttonKey="enterAdmin" />
      </section>
    </main>
  );
}
