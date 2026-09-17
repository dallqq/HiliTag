"use client";

import { useEffect, useState } from "react";
import { getApiBaseUrl, setApiBaseUrl } from "@/lib/api";

export function ModelStrip() {
  const [modelName, setModelName] = useState<string | null>(null);
  const [isLive, setIsLive] = useState<boolean | null>(null);
  const [showConfig, setShowConfig] = useState(false);
  const [apiUrl, setApiUrl] = useState("");

  const checkHealth = async () => {
    const base = getApiBaseUrl();
    setApiUrl(base);
    try {
      const res = await fetch(`${base}/health`, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setModelName(String(data.model || "best_model"));
        setIsLive(true);
        return;
      }
    } catch {
      // Backend offline or unreachable
    }
    setModelName("Demo Mode (Offline)");
    setIsLive(false);
  };

  useEffect(() => {
    checkHealth();
  }, []);

  const handleSaveUrl = (e: React.FormEvent) => {
    e.preventDefault();
    setApiBaseUrl(apiUrl);
    setShowConfig(false);
    checkHealth();
  };

  return (
    <>
      <footer
        className="flex items-center gap-2.5 border-t border-[rgba(139,69,19,0.15)] bg-paper-warm px-8 py-2 text-[11.5px] text-ink-muted"
        aria-label="Model information"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          aria-hidden="true"
        >
          <rect x="4" y="4" width="16" height="16" rx="2" />
          <rect x="9" y="9" width="6" height="6" />
          <path d="M15 2v2M9 2v2M2 9h2M2 15h2M22 9h-2M22 15h-2M15 22v-2M9 22v-2" />
        </svg>

        <span className="flex items-center gap-1.5 rounded-full border border-[rgba(139,69,19,0.15)] bg-paper-mid px-2.5 py-0.5 text-[11px] font-medium text-ink">
          <span
            className={`h-2 w-2 rounded-full ${
              isLive === true
                ? "bg-emerald-500"
                : isLive === false
                ? "bg-amber-500"
                : "bg-gray-400"
            }`}
          />
          {modelName ?? "checking..."}
        </span>

        <span>·</span>
        <span>Fine-tuned for Hiligaynon · 6 OntoNotes categories</span>

        <span className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowConfig(true)}
            className="flex items-center gap-1 rounded border border-[rgba(139,69,19,0.2)] bg-paper px-2 py-0.5 text-[11px] text-ink-muted transition hover:border-accent hover:text-ink"
            title="Configure Backend API URL"
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
            API: {apiUrl.replace(/^https?:\/\//, "") || "localhost:5000"}
          </button>
        </span>
      </footer>

      {showConfig && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl border border-[rgba(139,69,19,0.2)] bg-paper p-6 shadow-xl">
            <h3 className="font-lora text-[16px] font-semibold text-ink">
              Configure Flask Backend API
            </h3>
            <p className="mt-1 text-[13px] text-ink-muted">
              Connect the frontend to your local Flask server or a deployed inference API (e.g. Hugging Face Space, Render).
            </p>
            <form onSubmit={handleSaveUrl} className="mt-4">
              <label className="block text-[12px] font-medium text-ink mb-1.5">
                Flask API Base URL
              </label>
              <input
                type="text"
                value={apiUrl}
                onChange={(e) => setApiUrl(e.target.value)}
                placeholder="http://localhost:5000"
                className="w-full rounded-lg border border-[rgba(139,69,19,0.25)] bg-paper-warm px-3 py-2 text-[13px] text-ink outline-none focus:border-accent"
              />
              <p className="mt-1.5 text-[11px] text-ink-faint">
                Default is <code className="bg-paper-mid px-1 rounded">http://localhost:5000</code>. Saved in local storage.
              </p>
              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowConfig(false)}
                  className="rounded-lg border border-[rgba(139,69,19,0.25)] px-3 py-1.5 text-[13px] text-ink-muted hover:bg-paper-warm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-accent px-4 py-1.5 text-[13px] font-medium text-white hover:bg-accent-dark"
                >
                  Save & Connect
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
