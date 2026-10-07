import Link from "next/link";
import { LoginForm } from "@/components/LoginForm";

export default function AdminLoginPage() {
  return (
    <main className="auth-page admin-auth">
      <section className="auth-card">
        <Link className="back-link" href="/">
          Back home
        </Link>
        <h1>Admin login</h1>
        <p>This direct link opens the admin area only.</p>
        <LoginForm expectedRole="admin" buttonLabel="Enter admin panel" />
      </section>
    </main>
  );
}
