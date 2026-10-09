"use client";

/**
 * Delete the server session cookie, return to the public page, and refresh navigation state.
 */

import { useI18n } from "./I18nProvider";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function LogoutButton() {
  const { t } = useI18n();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function logout() {
    setLoading(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  return (
    <button
      className="ghost-button"
      type="button"
      onClick={logout}
      disabled={loading}
    >
      {loading ? t("Leaving...") : t("Logout")}
    </button>
  );
}
