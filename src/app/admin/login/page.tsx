/**
 * مدخل الأدمن المستقل، مع رابط تهيئة الحساب الأول عند الحاجة.
 */
import Link from "next/link";
import { LoginForm } from "@/components/LoginForm";
import { T } from "@/components/I18nProvider";

export default function AdminLoginPage() {
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
        <Link className="back-link" href="/admin/setup">
          <T k="setupAdmin" />
        </Link>
      </section>
    </main>
  );
}
