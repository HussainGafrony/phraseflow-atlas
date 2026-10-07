import Link from "next/link";
import { LoginForm } from "@/components/LoginForm";

export default function LoginPage() {
  return (
    <main className="auth-page">
      <section className="auth-card">
        <Link className="back-link" href="/">
          Back home
        </Link>
        <h1>User login</h1>
        <p>Enter the username and password created by the admin.</p>
        <LoginForm expectedRole="user" buttonLabel="Enter dashboard" />
      </section>
    </main>
  );
}
