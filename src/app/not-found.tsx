/** أي مسار غير موجود لا يفتح صلاحيات إضافية؛ نعرض 404 وروابط ثابتة معلومة. */
import Link from "next/link";
import { T } from "@/components/I18nProvider";
export default function NotFound() {
  return (
    <main className="auth-page">
      <section className="auth-card">
        <h1>
          <T k="Page not found" />
        </h1>
        <p>
          <T k="This link does not exist. Choose a destination below." />
        </p>
        <Link href="/">
          <T k="backHome" />
        </Link>
        <Link href="/login">
          <T k="userLogin" />
        </Link>
        <Link href="/admin/login">
          <T k="adminLogin" />
        </Link>
      </section>
    </main>
  );
}
