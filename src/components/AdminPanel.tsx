"use client";

/**
 * لوحة الأدمن: إنشاء الحسابات، رمز الفتح، إعداد المزوّدين واختبارهم، الجمل العامة، وقوائم التعلم. كل عملية تمر عبر API يتحقق من دور الأدمن.
 */

import { useEffect, useState } from "react";
import { SUPPORTED_LANGUAGES } from "@/lib/constants";
import { useI18n, T } from "./I18nProvider";

import { AudioSettingsPanel } from "./AudioSettingsPanel";

type ProviderState = {
  provider: string;
  displayName: string;
  enabled: boolean;
  priority: number;
  model: string;
  baseUrl: string;
  textEndpoint: string;
  audioEndpoint: string;
  apiKey?: string;
  hasApiKey?: boolean;
};

type UserState = {
  id: string;
  username: string;
  createdAt: string;
};

type LandingState = {
  language: string;
  text: string;
  arabicTranslation: string;
};

type LearningOptionState = {
  type: "topic" | "level" | "frequency";
  label: string;
  value: string;
  description?: string;
  order: number;
  isActive: boolean;
};

export function AdminPanel() {
  const { t, language: uiLanguage } = useI18n();
  const [testingProvider, setTestingProvider] = useState("");
  const [providerResults, setProviderResults] = useState<
    Record<string, { ok: boolean; message: string }>
  >({});
  const [users, setUsers] = useState<UserState[]>([]);
  const [providers, setProviders] = useState<ProviderState[]>([]);
  const [landing, setLanding] = useState<LandingState[]>([]);
  const [options, setOptions] = useState<LearningOptionState[]>([]);
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [unlockCode, setUnlockCode] = useState("");
  const [message, setMessage] = useState("");
  const [activeTab, setActiveTab] = useState("users");

  useEffect(() => {
    Promise.all([
      loadUsers(),
      loadProviders(),
      loadLanding(),
      loadOptions(),
    ]).catch(() => setMessage("Connection failed. Please try again."));
  }, []);

  async function loadUsers() {
    const response = await fetch("/api/admin/users");
    if (!response.ok) {
      return;
    }
    const data = await response.json();
    setUsers(data.users ?? []);
  }

  async function loadProviders() {
    const response = await fetch("/api/admin/providers");
    if (!response.ok) {
      return;
    }
    const data = await response.json();
    setProviders(data.providers ?? []);
  }

  async function loadLanding() {
    const response = await fetch("/api/admin/landing");
    if (!response.ok) {
      return;
    }
    const data = await response.json();
    setLanding(data.sentences ?? []);
  }

  async function loadOptions() {
    const response = await fetch("/api/admin/options");
    if (!response.ok) {
      return;
    }
    const data = await response.json();
    setOptions([
      ...(data.topics ?? []),
      ...(data.levels ?? []),
      ...(data.frequencies ?? []),
    ]);
  }

  async function createUser(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: newUsername, password: newPassword }),
      });

      const data = await response.json();
      if (!response.ok) {
        setMessage(data.error ?? "Could not create user.");
        return;
      }

      setNewUsername("");
      setNewPassword("");
      setMessage("User created.");
      await loadUsers();
    } catch {
      setMessage("Connection failed. Please try again.");
    }
  }

  async function saveUnlockCode(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    try {
      const response = await fetch("/api/admin/unlock-code", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: unlockCode }),
      });

      const data = await response.json();
      if (!response.ok) {
        setMessage(data.error ?? "Could not save code.");
        return;
      }

      setUnlockCode("");
      setMessage(
        "Unlock code saved. Give this code to the user after the first 10 sentences.",
      );
    } catch {
      setMessage("Connection failed. Please try again.");
    }
  }

  async function saveProviders() {
    setMessage("");
    try {
      const response = await fetch("/api/admin/providers", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ providers }),
      });

      const data = await response.json();
      if (!response.ok) {
        setMessage(data.error ?? "Could not save providers.");
        return;
      }

      setMessage("AI provider settings saved.");
      await loadProviders();
    } catch {
      setMessage("Connection failed. Please try again.");
    }
  }

  async function saveLanding() {
    setMessage("");
    try {
      const response = await fetch("/api/admin/landing", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sentences: landing }),
      });

      const data = await response.json();
      if (!response.ok) {
        setMessage(data.error ?? "Could not save landing sentences.");
        return;
      }

      setMessage("Landing sentences saved for this week.");
    } catch {
      setMessage("Connection failed. Please try again.");
    }
  }

  async function saveOptions() {
    setMessage("");
    try {
      const response = await fetch("/api/admin/options", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ options }),
      });
      const data = await response.json();
      if (!response.ok) {
        setMessage(data.error ?? "Could not save learning options.");
        return;
      }
      setMessage("Learning options saved.");
      await loadOptions();
    } catch {
      setMessage("Connection failed. Please try again.");
    }
  }

  // نحفظ بطاقة المزوّد المحدد فقط، ثم نختبر المفتاح والموديل والمسار الحقيقيين.
  async function testProvider(provider: string) {
    if (testingProvider) return;
    const selected = providers.find((item) => item.provider === provider);
    if (!selected) return;
    setTestingProvider(provider);
    setMessage("Testing provider...");
    try {
      const saved = await fetch("/api/admin/providers", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ providers: [selected] }),
      });
      if (!saved.ok) throw new Error((await saved.json()).error);
      // نمسح المفتاح من حالة الواجهة بعد الحفظ ولا نمس تعديلات البطاقات الأخرى.
      setProviders((current) =>
        current.map((item) =>
          item.provider === provider
            ? {
                ...item,
                apiKey: "",
                hasApiKey: Boolean(item.apiKey || item.hasApiKey),
              }
            : item,
        ),
      );
      const response = await fetch("/api/admin/providers/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider }),
      });
      const data = await response.json();
      const result = {
        ok: response.ok && data.ok === true,
        message: data.message ?? data.error ?? "Provider test failed.",
      };
      setProviderResults((current) => ({ ...current, [provider]: result }));
      setMessage("");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Connection failed. Please try again.";
      setProviderResults((current) => ({
        ...current,
        [provider]: { ok: false, message },
      }));
      setMessage("");
    } finally {
      setTestingProvider("");
    }
  }

  function updateProvider(
    index: number,
    key: keyof ProviderState,
    value: string | number | boolean,
  ) {
    setProviders((current) =>
      current.map((provider, providerIndex) =>
        providerIndex === index ? { ...provider, [key]: value } : provider,
      ),
    );
  }

  function updateLanding(
    index: number,
    key: keyof LandingState,
    value: string,
  ) {
    setLanding((current) =>
      current.map((sentence, sentenceIndex) =>
        sentenceIndex === index ? { ...sentence, [key]: value } : sentence,
      ),
    );
  }

  function updateOption(
    index: number,
    key: keyof LearningOptionState,
    value: string | number | boolean,
  ) {
    setOptions((current) =>
      current.map((option, optionIndex) =>
        optionIndex === index ? { ...option, [key]: value } : option,
      ),
    );
  }

  return (
    <section className="admin-panel">
      <div className="tabs" role="tablist" aria-label="Admin sections">
        {[
          ["users", t("users")],
          ["unlock", t("unlockCode")],
          ["providers", t("aiProviders")],
          ["landing", t("landingSentences")],
          ["options", t("learningOptions")],
          ["audio", t("Audio and storage")],
        ].map(([value, label]) => (
          <button
            type="button"
            className={activeTab === value ? "active" : ""}
            onClick={() => setActiveTab(value)}
            key={value}
          >
            {label}
          </button>
        ))}
      </div>

      {message ? <p className="form-message">{t(message)}</p> : null}

      {activeTab === "audio" ? <AudioSettingsPanel /> : null}

      {activeTab === "users" ? (
        <div className="admin-grid">
          <form className="panel-block stack-form" onSubmit={createUser}>
            <h2>
              {" "}
              <T k="Create user" />{" "}
            </h2>
            <label>
              {" "}
              <T k="Username" />{" "}
              <input
                value={newUsername}
                onChange={(event) => setNewUsername(event.target.value)}
                required
              />
            </label>
            <label>
              {" "}
              <T k="Password" />{" "}
              <input
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                required
              />
            </label>
            <button className="primary-button" type="submit">
              {" "}
              <T k="Create" />{" "}
            </button>
          </form>

          <div className="panel-block">
            <h2>
              {" "}
              <T k="Users" />{" "}
            </h2>
            <div className="table-list">
              {users.map((user) => (
                <div key={user.id}>
                  <strong>{user.username}</strong>
                  <span>
                    {new Date(user.createdAt).toLocaleDateString(uiLanguage)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {activeTab === "unlock" ? (
        <form
          className="panel-block stack-form narrow"
          onSubmit={saveUnlockCode}
        >
          <h2>
            {" "}
            <T k="Daily unlock code" />{" "}
          </h2>
          <p>
            {" "}
            <T k="The user receives 10 sentences first. After that, this code unlocks two more batches for the same day." />{" "}
          </p>
          <label>
            {" "}
            <T k="Code" />{" "}
            <input
              value={unlockCode}
              onChange={(event) => setUnlockCode(event.target.value)}
              required
            />
          </label>
          <button className="primary-button" type="submit">
            {" "}
            <T k="Save code" />{" "}
          </button>
        </form>
      ) : null}

      {activeTab === "providers" ? (
        <div className="provider-list">
          {providers.map((provider, index) => (
            <article
              className="panel-block provider-card"
              key={provider.provider}
            >
              <div className="provider-head">
                <div>
                  <h2>{provider.displayName}</h2>
                  <p>
                    {provider.hasApiKey
                      ? t("API key saved")
                      : t("No API key saved yet")}
                  </p>
                </div>
                <div className="provider-actions">
                  <button
                    className="secondary-button"
                    type="button"
                    disabled={Boolean(testingProvider)}
                    onClick={() => testProvider(provider.provider)}
                  >
                    {" "}
                    {t(
                      testingProvider === provider.provider
                        ? "Testing provider..."
                        : "Save and test provider",
                    )}{" "}
                  </button>
                  <label className="switch-row">
                    {" "}
                    <T k="Enabled" />{" "}
                    <input
                      type="checkbox"
                      checked={provider.enabled}
                      onChange={(event) =>
                        updateProvider(index, "enabled", event.target.checked)
                      }
                    />
                  </label>
                </div>
              </div>

              {providerResults[provider.provider] && (
                <p
                  role="status"
                  className={
                    providerResults[provider.provider].ok
                      ? "form-message"
                      : "form-message error"
                  }
                >
                  {t(providerResults[provider.provider].message)}
                </p>
              )}
              <div className="provider-fields">
                <label>
                  {" "}
                  <T k="Priority" />{" "}
                  <input
                    type="number"
                    min="1"
                    max="99"
                    value={provider.priority}
                    onChange={(event) =>
                      updateProvider(
                        index,
                        "priority",
                        Number(event.target.value),
                      )
                    }
                  />
                </label>
                <label>
                  {" "}
                  <T k="API key" />{" "}
                  <input
                    type="password"
                    value={provider.apiKey ?? ""}
                    placeholder={
                      provider.hasApiKey
                        ? t("Leave empty to keep current key")
                        : t("Paste API key")
                    }
                    onChange={(event) =>
                      updateProvider(index, "apiKey", event.target.value)
                    }
                  />
                </label>
                <label>
                  {" "}
                  <T k="Model" />{" "}
                  <input
                    value={provider.model}
                    onChange={(event) =>
                      updateProvider(index, "model", event.target.value)
                    }
                  />
                </label>
                <label>
                  {" "}
                  <T k="Base URL" />{" "}
                  <input
                    value={provider.baseUrl}
                    onChange={(event) =>
                      updateProvider(index, "baseUrl", event.target.value)
                    }
                  />
                </label>
                <label>
                  {" "}
                  <T k="Text endpoint" />{" "}
                  <input
                    value={provider.textEndpoint}
                    onChange={(event) =>
                      updateProvider(index, "textEndpoint", event.target.value)
                    }
                  />
                </label>
              </div>
            </article>
          ))}
          <button
            className="primary-button"
            type="button"
            disabled={Boolean(testingProvider)}
            onClick={saveProviders}
          >
            {" "}
            <T k="Save provider settings" />{" "}
          </button>
        </div>
      ) : null}

      {activeTab === "landing" ? (
        <div className="provider-list">
          {landing.map((sentence, index) => (
            <article className="panel-block provider-card" key={index}>
              <div className="provider-fields landing-fields">
                <label>
                  {" "}
                  <T k="Language" />{" "}
                  <select
                    value={sentence.language}
                    onChange={(event) =>
                      updateLanding(index, "language", event.target.value)
                    }
                  >
                    {SUPPORTED_LANGUAGES.map((language) => (
                      <option value={language.value} key={language.value}>
                        {t(language.label)}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  {" "}
                  <T k="Sentence" />{" "}
                  <input
                    value={sentence.text}
                    onChange={(event) =>
                      updateLanding(index, "text", event.target.value)
                    }
                  />
                </label>
                <label>
                  {" "}
                  <T k="Arabic translation" />{" "}
                  <input
                    dir="rtl"
                    value={sentence.arabicTranslation}
                    onChange={(event) =>
                      updateLanding(
                        index,
                        "arabicTranslation",
                        event.target.value,
                      )
                    }
                  />
                </label>
              </div>
            </article>
          ))}
          <button
            className="secondary-button"
            type="button"
            onClick={() =>
              setLanding((current) => [
                ...current,
                { language: "english", text: "", arabicTranslation: "" },
              ])
            }
          >
            {" "}
            <T k="Add sentence" />{" "}
          </button>
          <button
            className="primary-button"
            type="button"
            onClick={saveLanding}
          >
            {" "}
            <T k="Save landing sentences" />{" "}
          </button>
        </div>
      ) : null}

      {activeTab === "options" ? (
        <div className="provider-list">
          {options.map((option, index) => (
            <article className="panel-block provider-card" key={index}>
              <div className="provider-fields landing-fields">
                <label>
                  {" "}
                  <T k="Type" />{" "}
                  <select
                    value={option.type}
                    onChange={(event) =>
                      updateOption(
                        index,
                        "type",
                        event.target.value as LearningOptionState["type"],
                      )
                    }
                  >
                    <option value="topic">
                      {" "}
                      <T k="Topic" />{" "}
                    </option>
                    <option value="level">
                      {" "}
                      <T k="Level" />{" "}
                    </option>
                    <option value="frequency">
                      {" "}
                      <T k="Frequency" />{" "}
                    </option>
                  </select>
                </label>
                <label>
                  {" "}
                  <T k="Label" />{" "}
                  <input
                    value={option.label}
                    onChange={(event) =>
                      updateOption(index, "label", event.target.value)
                    }
                  />
                </label>
                <label>
                  {" "}
                  <T k="Value" />{" "}
                  <input
                    value={option.value}
                    onChange={(event) =>
                      updateOption(index, "value", event.target.value)
                    }
                  />
                </label>
              </div>
              <div className="option-row">
                <label>
                  {" "}
                  <T k="Order" />{" "}
                  <input
                    type="number"
                    value={option.order}
                    onChange={(event) =>
                      updateOption(index, "order", Number(event.target.value))
                    }
                  />
                </label>
                <label className="switch-row">
                  {" "}
                  <T k="Active" />{" "}
                  <input
                    type="checkbox"
                    checked={option.isActive}
                    onChange={(event) =>
                      updateOption(index, "isActive", event.target.checked)
                    }
                  />
                </label>
                <button
                  className="ghost-button"
                  type="button"
                  onClick={() =>
                    setOptions((current) =>
                      current.filter((_, optionIndex) => optionIndex !== index),
                    )
                  }
                >
                  {" "}
                  <T k="Remove" />{" "}
                </button>
              </div>
            </article>
          ))}
          <button
            className="secondary-button"
            type="button"
            onClick={() =>
              setOptions((current) => [
                ...current,
                {
                  type: "topic",
                  label: "New option",
                  value: "new-option",
                  order: current.length,
                  isActive: true,
                },
              ])
            }
          >
            {" "}
            <T k="Add option" />{" "}
          </button>
          <button
            className="primary-button"
            type="button"
            onClick={saveOptions}
          >
            {" "}
            <T k="Save learning options" />{" "}
          </button>
        </div>
      ) : null}
    </section>
  );
}
