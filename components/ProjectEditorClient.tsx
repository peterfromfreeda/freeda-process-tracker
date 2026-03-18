"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ProcessBuilder, type Macro, type Micro } from "@/components/ProcessBuilder";

type Project = { id: string; name: string };

export function ProjectEditorClient({ projectId }: { projectId: string }) {
  const [project, setProject] = useState<Project | null>(null);
  const [macros, setMacros] = useState<Macro[]>([]);
  const [microByMacro, setMicroByMacro] = useState<Record<string, Micro[]>>({});
  const [status, setStatus] = useState<"loading" | "idle" | "saving" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const saveTimer = useRef<number | null>(null);

  function buildPayload(source: Record<string, Micro[]>) {
    const out: Record<string, Array<{ id?: string; title: string; minutes: number; position: number }>> = {};
    for (const m of macros) {
      const steps = (source[m.id] ?? []).slice().sort((a, b) => a.position - b.position);
      out[m.id] = steps.map((s, i) => ({
        id: s.id,
        title: s.title ?? "",
        minutes: s.minutes ?? 0,
        position: i,
      }));
    }
    return out;
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setStatus("loading");
      setError(null);

      const [projRes, builderRes] = await Promise.all([
        fetch(`/api/projects/${projectId}`, { cache: "no-store" }),
        fetch(`/api/projects/${projectId}/builder`, { cache: "no-store" }),
      ]);

      const projJson = await projRes.json().catch(() => null);
      const builderJson = await builderRes.json().catch(() => null);

      if (cancelled) return;
      if (!projRes.ok) {
        setStatus("error");
        setError(projJson?.error ?? "Failed to load project");
        return;
      }
      if (!builderRes.ok) {
        setStatus("error");
        setError(builderJson?.error ?? "Failed to load builder data");
        return;
      }

      setProject(projJson?.project as Project);
      setMacros((builderJson?.macros ?? []) as Macro[]);

      const byMacro = (builderJson?.microStepsByMacroId ?? {}) as Record<string, Micro[]>;
      setMicroByMacro(byMacro);
      setStatus("idle");
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  async function saveNow(nextMicroByMacro: Record<string, Micro[]>) {
    setStatus("saving");
    setError(null);
    const payload = buildPayload(nextMicroByMacro);
    const res = await fetch(`/api/projects/${projectId}/builder`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ microStepsByMacroId: payload }),
    });
    if (!res.ok) {
      const json = await res.json().catch(() => null);
      setStatus("error");
      setError(json?.error ?? "Failed to save");
      return;
    }
    setStatus("idle");
  }

  function scheduleSave(nextMicroByMacro: Record<string, Micro[]>) {
    setMicroByMacro(nextMicroByMacro);
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      void saveNow(nextMicroByMacro);
    }, 400);
  }

  return (
    <div className="min-h-screen bg-[#fafafa] text-slate-900">
      <div className="max-w-[1400px] mx-auto px-8 py-12">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Link href="/projects" className="text-xs text-slate-400 hover:text-slate-600">
                ← Projects
              </Link>
              <Link href="/template" className="text-xs text-slate-400 hover:text-slate-600">
                Macro template
              </Link>
            </div>
            <h1 className="text-2xl font-semibold text-slate-900 mb-1">
              {project?.name ?? "Project"}
            </h1>
            <p className="text-sm text-slate-400">
              Edit micro steps per macro step. Changes save automatically.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              type="button"
              onClick={async () => {
                const nextName = window.prompt("Rename project", project?.name ?? "");
                if (!nextName) return;
                const res = await fetch(`/api/projects/${projectId}`, {
                  method: "PATCH",
                  headers: { "content-type": "application/json" },
                  body: JSON.stringify({ name: nextName }),
                });
                const json = await res.json().catch(() => null);
                if (!res.ok) {
                  setError(json?.error ?? "Rename failed");
                  return;
                }
                setProject(json?.project as Project);
              }}
            >
              Rename
            </Button>
            <Button
              variant="outline"
              type="button"
              onClick={async () => {
                await saveNow(microByMacro);
              }}
            >
              Save now
            </Button>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {status === "loading" ? (
          <div className="text-sm text-slate-400">Loading…</div>
        ) : (
          <ProcessBuilder
            macros={macros}
            microStepsByMacroId={microByMacro}
            onChangeMicroSteps={scheduleSave}
            readonlyMacros
          />
        )}

        <p className="text-xs text-slate-400 mt-4">
          Status: {status === "saving" ? "Saving…" : status === "idle" ? "Up to date" : status}
        </p>
      </div>
    </div>
  );
}

