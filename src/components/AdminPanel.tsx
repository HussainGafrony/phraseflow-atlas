"use client";

import { useEffect, useState } from "react";
import { SUPPORTED_LANGUAGES } from "@/lib/constants";
import { useI18n } from "./I18nProvider";

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
  const { t } = useI18n();
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
    loadUsers();
    loadProviders();
    loadLanding();
    loadOptions();
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
    setOptions([...(data.topics ?? []), ...(data.levels ?? []), ...(data.frequencies ?? [])]);
  }

  async function createUser(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    const response = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: newUsername, password: newPassword })
    });

    const data = await response.json();
    if (!response.ok) {
      setMessage(data.error ?? "Could not create user.");
      return;
    }

    setNewUsername("");
    setNewPassword("");
    setMessage("User created.");
    loadUsers();
  }

  async function saveUnlockCode(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    const response = await fetch("/api/admin/unlock-code", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: unlockCode })
    });

    const data = await response.json();
    if (!response.ok) {
      setMessage(data.error ?? "Could not save code.");
      return;
    }

    setUnlockCode("");
    setMessage("Unlock code saved. Give this code to the user after the first 10 sentences.");
  }

  async function saveProviders() {
    setMessage("");
    const response = await fetch("/api/admin/providers", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ providers })
    });

    const data = await response.json();
    if (!response.ok) {
      setMessage(data.error ?? "Could not save providers.");
      return;
    }

    setMessage("AI provider settings saved.");
    loadProviders();
  }

  async function saveLanding() {
    setMessage("");
    const response = await fetch("/api/admin/landing", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sentences: landing })
    });

    const data = await response.json();
    if (!response.ok) {
      setMessage(data.error ?? "Could not save landing sentences.");
      return;
    }

    setMessage("Landing sentences saved for this week.");
  }

  async function saveOptions() {
    setMessage("");
    const response = await fetch("/api/admin/options", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ options })
    });
    const data = await response.json();
    if (!response.ok) {
      setMessage(data.error ?? "Could not save learning options.");
      return;
    }
    setMessage("Learning options saved.");
    loadOptions();
  }

  async function testProvider(provider: string) {
    setMessage(`Testing ${provider}...`);
    const response = await fetch("/api/admin/providers/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider })
    });
    const data = await response.json();
    setMessage(data.message ?? (response.ok ? "Provider works." : "Provider test failed."));
  }

  function updateProvider(index: number, key: keyof ProviderState, value: string | number | boolean) {
    setProviders((current) =>
      current.map((provider, providerIndex) =>
        providerIndex === index ? { ...provider, [key]: value } : provider
      )
    );
  }

  function updateLanding(index: number, key: keyof LandingState, value: string) {
    setLanding((current) =>
      current.map((sentence, sentenceIndex) =>
        sentenceIndex === index ? { ...sentence, [key]: value } : sentence
      )
    );
  }

  function updateOption(index: number, key: keyof LearningOptionState, value: string | number | boolean) {
    setOptions((current) =>
      current.map((option, optionIndex) =>
        optionIndex === index ? { ...option, [key]: value } : option
      )
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
          ["options", t("learningOptions")]
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

      {message ? <p className="form-message">{message}</p> : null}

      {activeTab === "users" ? (
        <div className="admin-grid">
          <form className="panel-block stack-form" onSubmit={createUser}>
            <h2>Create user</h2>
            <label>
              Username
              <input value={newUsername} onChange={(event) => setNewUsername(event.target.value)} required />
            </label>
            <label>
              Password
              <input
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                required
              />
            </label>
            <button className="primary-button" type="submit">
              Create
            </button>
          </form>

          <div className="panel-block">
            <h2>Users</h2>
            <div className="table-list">
              {users.map((user) => (
                <div key={user.id}>
                  <strong>{user.username}</strong>
                  <span>{new Date(user.createdAt).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {activeTab === "unlock" ? (
        <form className="panel-block stack-form narrow" onSubmit={saveUnlockCode}>
          <h2>Daily unlock code</h2>
          <p>
            The user receives 10 sentences first. After that, this code unlocks two more batches
            for the same day.
          </p>
          <label>
            Code
            <input value={unlockCode} onChange={(event) => setUnlockCode(event.target.value)} required />
          </label>
          <button className="primary-button" type="submit">
            Save code
          </button>
        </form>
      ) : null}

      {activeTab === "providers" ? (
        <div className="provider-list">
          {providers.map((provider, index) => (
            <article className="panel-block provider-card" key={provider.provider}>
              <div className="provider-head">
                <div>
                  <h2>{provider.displayName}</h2>
                  <p>{provider.hasApiKey ? "API key saved" : "No API key saved yet"}</p>
                </div>
                <div className="provider-actions">
                  <button className="secondary-button" type="button" onClick={() => testProvider(provider.provider)}>
                    Test
                  </button>
                  <label className="switch-row">
                    Enabled
                    <input
                      type="checkbox"
                      checked={provider.enabled}
                      onChange={(event) => updateProvider(index, "enabled", event.target.checked)}
                    />
                  </label>
                </div>
              </div>

              <div className="provider-fields">
                <label>
                  Priority
                  <input
                    type="number"
                    min="1"
                    max="99"
                    value={provider.priority}
                    onChange={(event) => updateProvider(index, "priority", Number(event.target.value))}
                  />
                </label>
                <label>
                  API key
                  <input
                    type="password"
                    value={provider.apiKey ?? ""}
                    placeholder={provider.hasApiKey ? "Leave empty to keep current key" : "Paste API key"}
                    onChange={(event) => updateProvider(index, "apiKey", event.target.value)}
                  />
                </label>
                <label>
                  Model
                  <input
                    value={provider.model}
                    onChange={(event) => updateProvider(index, "model", event.target.value)}
                  />
                </label>
                <label>
                  Base URL
                  <input
                    value={provider.baseUrl}
                    onChange={(event) => updateProvider(index, "baseUrl", event.target.value)}
                  />
                </label>
                <label>
                  Text endpoint
                  <input
                    value={provider.textEndpoint}
                    onChange={(event) => updateProvider(index, "textEndpoint", event.target.value)}
                  />
                </label>
                <label>
                  Audio endpoint
                  <input
                    value={provider.audioEndpoint}
                    onChange={(event) => updateProvider(index, "audioEndpoint", event.target.value)}
                  />
                </label>
              </div>
            </article>
          ))}
          <button className="primary-button" type="button" onClick={saveProviders}>
            Save provider settings
          </button>
        </div>
      ) : null}

      {activeTab === "landing" ? (
        <div className="provider-list">
          {landing.map((sentence, index) => (
            <article className="panel-block provider-card" key={`${sentence.text}-${index}`}>
              <div className="provider-fields landing-fields">
                <label>
                  Language
                  <select
                    value={sentence.language}
                    onChange={(event) => updateLanding(index, "language", event.target.value)}
                  >
                    {SUPPORTED_LANGUAGES.map((language) => (
                      <option value={language.value} key={language.value}>
                        {language.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Sentence
                  <input value={sentence.text} onChange={(event) => updateLanding(index, "text", event.target.value)} />
                </label>
                <label>
                  Arabic translation
                  <input
                    dir="rtl"
                    value={sentence.arabicTranslation}
                    onChange={(event) => updateLanding(index, "arabicTranslation", event.target.value)}
                  />
                </label>
              </div>
            </article>
          ))}
          <button className="secondary-button" type="button" onClick={() => setLanding((current) => [...current, { language: "english", text: "", arabicTranslation: "" }])}>
            Add sentence
          </button>
          <button className="primary-button" type="button" onClick={saveLanding}>
            Save landing sentences
          </button>
        </div>
      ) : null}

      {activeTab === "options" ? (
        <div className="provider-list">
          {options.map((option, index) => (
            <article className="panel-block provider-card" key={`${option.type}-${option.value}-${index}`}>
              <div className="provider-fields landing-fields">
                <label>
                  Type
                  <select
                    value={option.type}
                    onChange={(event) =>
                      updateOption(index, "type", event.target.value as LearningOptionState["type"])
                    }
                  >
                    <option value="topic">Topic</option>
                    <option value="level">Level</option>
                    <option value="frequency">Frequency</option>
                  </select>
                </label>
                <label>
                  Label
                  <input value={option.label} onChange={(event) => updateOption(index, "label", event.target.value)} />
                </label>
                <label>
                  Value
                  <input value={option.value} onChange={(event) => updateOption(index, "value", event.target.value)} />
                </label>
              </div>
              <div className="option-row">
                <label>
                  Order
                  <input
                    type="number"
                    value={option.order}
                    onChange={(event) => updateOption(index, "order", Number(event.target.value))}
                  />
                </label>
                <label className="switch-row">
                  Active
                  <input
                    type="checkbox"
                    checked={option.isActive}
                    onChange={(event) => updateOption(index, "isActive", event.target.checked)}
                  />
                </label>
                <button
                  className="ghost-button"
                  type="button"
                  onClick={() => setOptions((current) => current.filter((_, optionIndex) => optionIndex !== index))}
                >
                  Remove
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
                { type: "topic", label: "New option", value: "new-option", order: current.length, isActive: true }
              ])
            }
          >
            Add option
          </button>
          <button className="primary-button" type="button" onClick={saveOptions}>
            Save learning options
          </button>
        </div>
      ) : null}
    </section>
  );
}
