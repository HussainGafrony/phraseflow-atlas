/**
 * مدخل المستخدم العادي مع رسائل وتعليمات مترجمة؛ التحقق الفعلي يتم في API الدخول.
 */
import Link from "next/link";
import { LoginForm } from "@/components/LoginForm";
import { T } from "@/components/I18nProvider";

export default function LoginPage() {
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
