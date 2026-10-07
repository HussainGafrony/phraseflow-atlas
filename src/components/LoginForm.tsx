"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type LoginFormProps = {
  expectedRole: "user" | "admin";
  buttonLabel: string;
};

export function LoginForm({ expectedRole, buttonLabel }: LoginFormProps) {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password, expectedRole })
    });

    const data = await response.json();
    setLoading(false);

    if (!response.ok) {
      setMessage(data.error ?? "Login failed.");
      return;
    }

    router.push(data.redirectTo);
    router.refresh();
  }

  return (
    <form className="stack-form" onSubmit={handleSubmit}>
      <label>
        Username
        <input
          autoComplete="username"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          required
        />
      </label>
      <label>
        Password
        <input
          autoComplete="current-password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
      </label>
      {message ? <p className="form-message error">{message}</p> : null}
      <button className="primary-button" disabled={loading} type="submit">
        {loading ? "Checking..." : buttonLabel}
      </button>
    </form>
  );
}
