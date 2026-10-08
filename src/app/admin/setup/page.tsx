/**
 * صفحة تهيئة أول أدمن. عرض الصفحة وحده لا يمنح صلاحيات؛ API يتحقق من الرمز ومن عدم وجود أدمن.
 */
import Link from "next/link";
import { SetupAdminForm } from "@/components/SetupAdminForm";
import { T } from "@/components/I18nProvider";

export default function AdminSetupPage() {
  return (
    <main className="auth-page admin-auth">
      <section className="auth-card">
        <Link className="back-link" href="/">
          <T k="backHome" />
        </Link>
        <h1>
          <T k="setupAdmin" />
        </h1>
        <p>
          {" "}
          <T k="Create the first admin account. This page closes automatically after an admin exists." />{" "}
        </p>
        <SetupAdminForm />
      </section>
    </main>
  );
}
