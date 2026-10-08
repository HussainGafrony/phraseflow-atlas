"use client";

/**
 * إعداد خدمة الصوت والتخزين من لوحة الأدمن. الحقول السرية تُرسل للسيرفر للتشفير ولا تعود في رد القراءة؛ الاختبار يفحص التوليد والتخزين والتشغيل.
 */

import { useEffect, useState } from "react";
import { useI18n } from "./I18nProvider";
type Settings = {
  enabled: boolean;
  baseUrl: string;
  endpoint: string;
  model: string;
  voice: string;
  apiKey: string;
  blobToken: string;
  hasApiKey?: boolean;
  hasBlobToken?: boolean;
};
export function AudioSettingsPanel() {
  const { t } = useI18n();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [audioUrl, setAudioUrl] = useState("");
  useEffect(() => {
    fetch("/api/admin/audio")
      .then(async (response) => {
        if (!response.ok) throw new Error();
        setSettings({ ...(await response.json()), apiKey: "", blobToken: "" });
      })
      .catch(() => setMessage("Connection failed. Please try again."));
  }, []);
  async function save(test = false) {
    if (!settings) return;
    setBusy(true);
    setMessage("");
    setAudioUrl("");
    try {
      const response = await fetch("/api/admin/audio", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (!response.ok) throw new Error((await response.json()).error);
      setSettings({
        ...settings,
        apiKey: "",
        blobToken: "",
        hasApiKey: Boolean(settings.apiKey || settings.hasApiKey),
        hasBlobToken: Boolean(settings.blobToken || settings.hasBlobToken),
      });
      if (test) {
        const result = await fetch("/api/admin/audio", { method: "POST" });
        const data = await result.json();
        if (!result.ok) throw new Error(data.error);
        setAudioUrl(data.audioUrl);
        setMessage("Audio generated and stored successfully.");
      } else setMessage("Audio settings saved.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Connection failed. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="panel-block stack-form">
      <h2>{t("Audio and storage")}</h2>
      <p>
        {t(
          "Use an OpenAI-compatible speech service and a private Vercel Blob store. Keys are encrypted. Save and test to verify generation, storage, and playback.",
        )}
      </p>
      {settings && (
        <>
          <label className="switch-row">
            {t("Enabled")}
            <input
              type="checkbox"
              checked={settings.enabled}
              onChange={(event) =>
                setSettings({ ...settings, enabled: event.target.checked })
              }
            />
          </label>
          {(
            [
              ["baseUrl", "Base URL"],
              ["endpoint", "Audio endpoint"],
              ["model", "Audio model"],
              ["voice", "Voice"],
              ["apiKey", "Audio API key"],
              ["blobToken", "Private Blob token"],
            ] as const
          ).map(([key, label]) => (
            <label key={key}>
              {t(label)}
              <input
                type={
                  key === "apiKey" || key === "blobToken" ? "password" : "text"
                }
                value={settings[key]}
                autoComplete="off"
                onChange={(event) =>
                  setSettings({ ...settings, [key]: event.target.value })
                }
                placeholder={
                  (key === "apiKey" && settings.hasApiKey) ||
                  (key === "blobToken" && settings.hasBlobToken)
                    ? t("Leave empty to keep current key")
                    : ""
                }
              />
            </label>
          ))}
          <button
            className="primary-button"
            type="button"
            disabled={busy}
            onClick={() => save()}
          >
            {t("Save audio settings")}
          </button>
          <button
            className="secondary-button"
            type="button"
            disabled={busy}
            onClick={() => save(true)}
          >
            {t("Save and test audio")}
          </button>
        </>
      )}
      {message && <p role="status">{t(message)}</p>}
      {audioUrl && <audio controls src={audioUrl} />}
    </div>
  );
}
