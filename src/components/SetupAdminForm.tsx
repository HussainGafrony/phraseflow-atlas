"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "./I18nProvider";

export function SetupAdminForm() {
  const router = useRouter();
  const { t } = useI18n();
  const [token, setToken] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [setupAvailable, setSetupAvailable] = useState<boolean | null>(null);
  const [tokenRequired, setTokenRequired] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadStatus() {
      const response = await fetch("/api/admin/setup");
      const data = await response.json();
      setSetupAvailable(Boolean(data.setupAvailable));
      setTokenRequired(Boolean(data.tokenRequired));
    }

    loadStatus();
  }, []);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    const response = await fetch("/api/admin/setup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, username, password })
    });
    const data = await response.json();
    setLoading(false);

    if (!response.ok) {
      setMessage(data.error ?? "Setup failed.");
      return;
    }

    setMessage("Admin created. Redirecting to login...");
    setTimeout(() => router.push("/admin/login"), 800);
  }

  if (setupAvailable === false) {
    return <p className="form-message">Admin setup is already complete.</p>;
  }

  return (
    <form className="stack-form" onSubmit={submit}>
      {tokenRequired ? (
        <label>
          Setup token
          <input value={token} onChange={(event) => setToken(event.target.value)} required />
        </label>
      ) : null}
      <label>
        {t("username")}
        <input value={username} onChange={(event) => setUsername(event.target.value)} required />
      </label>
      <label>
        {t("password")}
        <input
          type="password"
          minLength={8}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
      </label>
      {message ? <p className="form-message">{message}</p> : null}
      <button className="primary-button" type="submit" disabled={loading || setupAvailable === null}>
        {loading ? "Creating..." : t("setupAdmin")}
      </button>
    </form>
  );
}
