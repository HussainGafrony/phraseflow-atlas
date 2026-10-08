"use client";
/** وظيفة الأدمن الوحيدة: إنشاء حساب مستخدم. لا قوائم حسابات أو إعدادات أو صلاحيات إضافية. */
import { useState } from "react";
import { useI18n } from "./I18nProvider";
export function AdminPanel() {
  const { t } = useI18n();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [createdUsername, setCreatedUsername] = useState("");
  async function createUser(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setMessage("");
    setCreatedUsername("");
    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await response.json();
      if (!response.ok) {
        setMessage(data.error ?? "Could not create user.");
        return;
      }
      setCreatedUsername(data.user.username);
      setUsername("");
      setPassword("");
      setMessage("User created.");
    } catch {
      setMessage("Connection failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="admin-panel">
      <form className="panel-block stack-form narrow" onSubmit={createUser}>
        <h2>{t("Create user")}</h2>
        <p>{t("The administrator can only create user accounts.")}</p>
        <label>
          {t("username")}
          <input
            value={username}
            minLength={3}
            maxLength={40}
            autoComplete="off"
            onChange={(event) => setUsername(event.target.value)}
            required
          />
        </label>
        <label>
          {t("password")}
          <input
            type="password"
            value={password}
            minLength={6}
            maxLength={120}
            autoComplete="new-password"
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </label>
        <button className="primary-button" type="submit" disabled={busy}>
          {t(busy ? "Creating..." : "Create")}
        </button>
        {message && (
          <p role="status" className="form-message">
            {t(message)} {createdUsername && <strong>{createdUsername}</strong>}
          </p>
        )}
      </form>
    </section>
  );
}
