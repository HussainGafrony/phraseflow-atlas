"use client";
/** وظيفة الأدمن: إنشاء حساب مستخدم أو أدمن إضافي. لا قوائم حسابات أو إعدادات أو صلاحيات إضافية. */
import { useState } from "react";
import { useI18n } from "./I18nProvider";
export function AdminPanel() {
  const { t } = useI18n();
  const [username, setUsername] = useState("");
  const [role, setRole] = useState<"user" | "admin">("user");
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
        body: JSON.stringify({ username, password, role }),
      });
      const data = await response.json();
      if (!response.ok) {
        setMessage(data.error ?? "Could not create user.");
        return;
      }
      setCreatedUsername(data.user.username);
      setUsername("");
      setPassword("");
      setRole("user");
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
        <h2>{t("Create account")}</h2>
        <p>{t("Create a user or administrator account.")}</p>
        <label>
          {t("username")}
          <input
            value={username}
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
            autoComplete="new-password"
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </label>
        <label>
          {t("Account type")}
          <select
            value={role}
            onChange={(event) =>
              setRole(event.target.value as "user" | "admin")
            }
          >
            <option value="user">{t("User")}</option>
            <option value="admin">{t("Admin")}</option>
          </select>
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
