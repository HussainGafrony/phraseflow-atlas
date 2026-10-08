"use client";

/**
 * تهيئة أول أدمن فقط: يقرأ حالة التهيئة ثم يرسل الرمز وبيانات الحساب. السيرفر هو المسؤول عن إغلاق التهيئة بعد أول حساب.
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n, T } from "./I18nProvider";

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
      if (!response.ok) throw new Error();
      setSetupAvailable(Boolean(data.setupAvailable));
      setTokenRequired(Boolean(data.tokenRequired));
    }

    loadStatus().catch(() =>
      setMessage("Connection failed. Please try again."),
    );
  }, []);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/admin/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, username, password }),
      });
      const data = await response.json();
      setLoading(false);

      if (!response.ok) {
        setMessage(data.error ?? "Setup failed.");
        return;
      }

      setMessage("Admin created. Redirecting to login...");
      setTimeout(() => router.push("/admin/login"), 800);
    } catch {
      setMessage("Connection failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (setupAvailable === false) {
    return (
      <p className="form-message">
        {" "}
        <T k="Admin setup is already complete." />{" "}
      </p>
    );
  }

  return (
    <form className="stack-form" onSubmit={submit}>
      {tokenRequired ? (
        <label>
          {" "}
          <T k="Setup token" />{" "}
          <input
            type="password"
            autoComplete="off"
            value={token}
            onChange={(event) => setToken(event.target.value)}
            required
          />
        </label>
      ) : null}
      <label>
        {t("username")}
        <input
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          required
        />
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
      {message ? <p className="form-message">{t(message)}</p> : null}
      <button
        className="primary-button"
        type="submit"
        disabled={loading || setupAvailable === null}
      >
        {loading ? t("Creating...") : t("setupAdmin")}
      </button>
    </form>
  );
}
