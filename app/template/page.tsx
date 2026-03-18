"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

type MacroTemplate = { id: string; title: string; position: number };

function makeUuid() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  // Fallback: a fixed but valid UUID format (rarely used in modern browsers)
  return "00000000-0000-4000-8000-000000000000";
}

export default function TemplatePage() {
  const [macros, setMacros] = useState<MacroTemplate[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "saving" | "error">("loading");
  const [error, setError] = useState<string | null>(null);

  const normalized = useMemo(
    () =>
      macros
        .map((m, i) => ({ ...m, position: i }))
        .sort((a, b) => a.position - b.position),
    [macros]
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setStatus("loading");
      setError(null);
      const res = await fetch("/api/template", { cache: "no-store" });
      const json = await res.json().catch(() => null);
      if (cancelled) return;
      if (!res.ok) {
        setStatus("error");
        setError(json?.error ?? "Failed to load template");
        return;
      }
      setMacros((json?.macros ?? []) as MacroTemplate[]);
      setStatus("idle");
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function save(next: MacroTemplate[]) {
    setMacros(next);
    setStatus("saving");
    setError(null);
    const res = await fetch("/api/template", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        macros: next.map((m, i) => ({ id: m.id, title: m.title, position: i })),
      }),
    });
    if (!res.ok) {
      const json = await res.json().catch(() => null);
      setStatus("error");
      setError(json?.error ?? "Failed to save");
      return;
    }
    setStatus("idle");
  }

  return (
    <div className="min-h-screen bg-[#fafafa] text-slate-900">
      <div className="max-w-[1000px] mx-auto px-8 py-12">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 mb-1">
              Macro template
            </h1>
            <p className="text-sm text-slate-400">
              These macro steps are shared by all projects.
            </p>
          </div>
          <Button
            variant="outline"
            type="button"
            onClick={() => {
              const next = [
                ...normalized,
                { id: makeUuid(), title: "", position: normalized.length },
              ];
              void save(next);
            }}
          >
            Add macro
          </Button>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <Card className="border border-slate-200/80 shadow-none rounded-xl">
          <CardHeader className="pb-3 pt-5 px-5">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-800">Steps</p>
              <p className="text-xs text-slate-400">
                {status === "saving"
                  ? "Saving…"
                  : status === "loading"
                    ? "Loading…"
                    : "Autosave"}
              </p>
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-5 space-y-2">
            {normalized.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-200 p-4 text-sm text-slate-400">
                No macros yet. Add one to get started.
              </div>
            ) : (
              normalized.map((m, i) => (
                <div
                  key={m.id}
                  className="grid grid-cols-[auto_1fr_auto] gap-2 items-center"
                >
                  <div className="text-xs text-slate-400 tabular-nums w-6 text-right">
                    {i + 1}
                  </div>
                  <input
                    value={m.title}
                    placeholder="Macro step title"
                    onChange={(e) => {
                      const next = normalized.map((x) =>
                        x.id === m.id ? { ...x, title: e.target.value } : x
                      );
                      void save(next);
                    }}
                    className="h-9 rounded-md border border-slate-200 px-2 text-sm font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-blue-100"
                  />
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      type="button"
                      disabled={i === 0}
                      onClick={() => {
                        if (i === 0) return;
                        const next = [...normalized];
                        const tmp = next[i - 1];
                        next[i - 1] = next[i];
                        next[i] = tmp;
                        void save(next);
                      }}
                      aria-label="Move macro up"
                    >
                      ↑
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      type="button"
                      disabled={i === normalized.length - 1}
                      onClick={() => {
                        if (i === normalized.length - 1) return;
                        const next = [...normalized];
                        const tmp = next[i + 1];
                        next[i + 1] = next[i];
                        next[i] = tmp;
                        void save(next);
                      }}
                      aria-label="Move macro down"
                    >
                      ↓
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      type="button"
                      onClick={async () => {
                        setStatus("saving");
                        setError(null);
                        const res = await fetch(`/api/template/${m.id}`, { method: "DELETE" });
                        if (!res.ok) {
                          const json = await res.json().catch(() => null);
                          setStatus("error");
                          setError(json?.error ?? "Failed to delete");
                          return;
                        }
                        const next = normalized.filter((x) => x.id !== m.id);
                        await save(next);
                      }}
                      aria-label="Delete macro"
                    >
                      ✕
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

