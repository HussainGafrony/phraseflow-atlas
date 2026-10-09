/**
 * User login page with translated instructions and messages. Authentication is handled by the login API.
 */
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { LoginForm } from "@/components/LoginForm";
import { T } from "@/components/I18nProvider";

export default async function LoginPage() {
  // Use the current session to choose the destination; never trust a redirectTo query parameter.
  const session = await getSession();
  if (session) redirect(session.role === "admin" ? "/admin" : "/dashboard");
  return (
    <main className="auth-page">
      <section className="auth-card">
        <Link className="back-link" href="/">
          <T k="backHome" />
        </Link>
        <h1>
          <T k="userLogin" />
        </h1>
        <p>
          {" "}
          <T k="Enter the username and password created by the admin." />{" "}
        </p>
        <LoginForm expectedRole="user" buttonKey="enterDashboard" />
      </section>
    </main>
  );
}
