"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

type Project = {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
};

function formatDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString();
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [status, setStatus] = useState<"loading" | "idle" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const sorted = useMemo(
    () =>
      [...projects].sort(
        (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      ),
    [projects]
  );

  async function reload() {
    setStatus("loading");
    setError(null);
    const res = await fetch("/api/projects", { cache: "no-store" });
    const json = await res.json().catch(() => null);
    if (!res.ok) {
      setStatus("error");
      setError(json?.error ?? "Failed to load projects");
      return;
    }
    setProjects((json?.projects ?? []) as Project[]);
    setStatus("idle");
  }

  useEffect(() => {
    void reload();
  }, []);

  return (
    <div className="min-h-screen bg-[#fafafa] text-slate-900">
      <div className="max-w-[1100px] mx-auto px-8 py-12">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 mb-1">Projects</h1>
            <p className="text-sm text-slate-400">
              Each project uses the shared macro template, but has its own micro steps.
            </p>
          </div>
          <Button
            variant="outline"
            type="button"
            onClick={async () => {
              setBusyId("create");
              setError(null);
              const res = await fetch("/api/projects", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ name: `Project ${projects.length + 1}` }),
              });
              const json = await res.json().catch(() => null);
              setBusyId(null);
              if (!res.ok) {
                setError(json?.error ?? "Failed to create project");
                return;
              }
              const p = json?.project as Project;
              window.location.href = `/projects/${p.id}`;
            }}
            disabled={busyId === "create"}
          >
            New project
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
              <p className="text-sm font-semibold text-slate-800">Your projects</p>
              <div className="flex items-center gap-2">
                <Link href="/template" className="text-xs text-slate-400 hover:text-slate-600">
                  Edit macro template
                </Link>
                <Button variant="outline" size="sm" type="button" onClick={reload}>
                  Refresh
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-5 space-y-2">
            {status === "loading" ? (
              <div className="text-sm text-slate-400 py-6">Loading…</div>
            ) : sorted.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-200 p-4 text-sm text-slate-400">
                No projects yet. Create one to start.
              </div>
            ) : (
              sorted.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-slate-200/70 bg-white px-4 py-3"
                >
                  <div className="min-w-0">
                    <Link href={`/projects/${p.id}`} className="block">
                      <p className="text-sm font-semibold text-slate-800 truncate">{p.name}</p>
                    </Link>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Updated {formatDate(p.updated_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      type="button"
                      onClick={async () => {
                        const nextName = window.prompt("Rename project", p.name);
                        if (!nextName) return;
                        setBusyId(p.id);
                        const res = await fetch(`/api/projects/${p.id}`, {
                          method: "PATCH",
                          headers: { "content-type": "application/json" },
                          body: JSON.stringify({ name: nextName }),
                        });
                        const json = await res.json().catch(() => null);
                        setBusyId(null);
                        if (!res.ok) {
                          setError(json?.error ?? "Rename failed");
                          return;
                        }
                        await reload();
                      }}
                      disabled={busyId === p.id}
                    >
                      Rename
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      type="button"
                      onClick={async () => {
                        setBusyId(p.id);
                        const res = await fetch(`/api/projects/${p.id}/duplicate`, { method: "POST" });
                        const json = await res.json().catch(() => null);
                        setBusyId(null);
                        if (!res.ok) {
                          setError(json?.error ?? "Duplicate failed");
                          return;
                        }
                        await reload();
                      }}
                      disabled={busyId === p.id}
                    >
                      Duplicate
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      type="button"
                      onClick={async () => {
                        if (!window.confirm(`Delete “${p.name}”?`)) return;
                        setBusyId(p.id);
                        const res = await fetch(`/api/projects/${p.id}`, { method: "DELETE" });
                        const json = await res.json().catch(() => null);
                        setBusyId(null);
                        if (!res.ok) {
                          setError(json?.error ?? "Delete failed");
                          return;
                        }
                        await reload();
                      }}
                      disabled={busyId === p.id}
                    >
                      Delete
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

