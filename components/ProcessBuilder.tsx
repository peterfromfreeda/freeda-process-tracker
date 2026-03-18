"use client";

import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export type Macro = { id: string; title: string; position: number };
export type Micro = { id: string; title: string; minutes: number; position: number };

function makeUuid() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  // Fallback: a fixed but valid UUID format (rarely used in modern browsers)
  return "00000000-0000-4000-8000-000000000000";
}

function clampMinutes(n: number) {
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n);
}

function macroMinutes(steps: Micro[]) {
  return steps.reduce((sum, s) => sum + (Number.isFinite(s.minutes) ? s.minutes : 0), 0);
}

export function ProcessBuilder({
  macros,
  microStepsByMacroId,
  onChangeMicroSteps,
  readonlyMacros = true,
}: {
  macros: Macro[];
  microStepsByMacroId: Record<string, Micro[]>;
  onChangeMicroSteps: (next: Record<string, Micro[]>) => void;
  readonlyMacros?: boolean;
}) {
  const derived = useMemo(() => {
    const macroTotals = macros.map((m, index) => ({
      macroId: m.id,
      index,
      label: m.title || `Step ${index + 1}`,
      minutes: macroMinutes(microStepsByMacroId[m.id] ?? []),
    }));
    const totalMinutes = macroTotals.reduce((a, x) => a + x.minutes, 0);
    const microCount = Object.values(microStepsByMacroId).reduce((a, arr) => a + arr.length, 0);
    return { macroTotals, totalMinutes, microCount };
  }, [macros, microStepsByMacroId]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200/80 rounded-xl px-5 py-4">
          <p className="text-xs text-slate-400 mb-1">Macro steps</p>
          <p className="text-xl font-semibold text-slate-800">{macros.length}</p>
          <p className="text-xs text-slate-400 mt-0.5">
            {readonlyMacros ? "Shared template" : "Editable"}
          </p>
        </div>
        <div className="bg-white border border-slate-200/80 rounded-xl px-5 py-4">
          <p className="text-xs text-slate-400 mb-1">Micro steps</p>
          <p className="text-xl font-semibold text-slate-800">{derived.microCount}</p>
          <p className="text-xs text-slate-400 mt-0.5">Per project</p>
        </div>
        <div className="bg-white border border-slate-200/80 rounded-xl px-5 py-4">
          <p className="text-xs text-slate-400 mb-1">Total time</p>
          <p className="text-xl font-semibold text-slate-800 tabular-nums">
            {derived.totalMinutes} min
          </p>
          <p className="text-xs text-slate-400 mt-0.5">Sum of all micro steps</p>
        </div>
      </div>

      {/* Chart */}
      {derived.macroTotals.length > 0 && (
        <div className="bg-white border border-slate-200/80 rounded-xl px-6 pt-6 pb-4">
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="text-sm font-semibold text-slate-800">
                Time per macro step
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                Minutes shown · computed as sum of micro steps
              </p>
            </div>
            <div className="text-xs text-slate-400 tabular-nums">
              Total: {derived.totalMinutes} min
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart
              data={derived.macroTotals.map((m) => ({
                name: `S${m.index + 1}`,
                label: m.label,
                minutes: m.minutes,
              }))}
              margin={{ top: 4, right: 0, left: -20, bottom: 0 }}
              barCategoryGap="35%"
            >
              <CartesianGrid
                vertical={false}
                strokeDasharray="3 3"
                stroke="#f1f5f9"
              />
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: "#94a3b8" }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: "#94a3b8" }}
              />
              <Tooltip
                cursor={{ fill: "#f8fafc" }}
                content={({ active, payload }: any) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0].payload as { label: string; minutes: number };
                  return (
                    <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 shadow-sm text-sm">
                      <p className="font-medium text-slate-800 mb-1">{d.label}</p>
                      <p className="text-slate-500">{d.minutes} min</p>
                    </div>
                  );
                }}
              />
              <Bar dataKey="minutes" radius={[5, 5, 0, 0]} maxBarSize={56}>
                {derived.macroTotals.map((_, index) => (
                  <Cell key={index} fill="#3b82f6" />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="flex gap-4 overflow-x-auto pb-6 snap-x snap-mandatory">
        {macros
          .slice()
          .sort((a, b) => a.position - b.position)
          .map((m, i) => {
            const micro = (microStepsByMacroId[m.id] ?? []).slice().sort((a, b) => a.position - b.position);
            const minutes = macroMinutes(micro);
            return (
              <div key={m.id} className="snap-start">
                <Card className="min-w-[360px] w-[360px] flex-shrink-0 border border-slate-200/80 shadow-none rounded-xl">
                  <CardHeader className="pb-3 pt-4 px-5">
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="w-6 h-6 rounded-md flex items-center justify-center text-white text-xs font-semibold flex-shrink-0 mt-0.5 bg-slate-500">
                        {i + 1}
                      </div>
                      <Badge
                        variant="secondary"
                        className="text-[10px] px-2 py-0 h-5 bg-slate-50 text-slate-600 border-0"
                      >
                        Sum of micro steps
                      </Badge>
                    </div>

                    <p className="text-sm font-semibold text-slate-800 leading-tight">
                      {m.title || `Step ${i + 1}`}
                    </p>

                    <div className="mt-2 flex items-baseline gap-1">
                      <span className="text-2xl font-semibold text-slate-800 tabular-nums">{minutes}</span>
                      <span className="text-sm text-slate-400">min</span>
                    </div>
                  </CardHeader>

                  <CardContent className="px-5 pb-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
                        Micro steps
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        type="button"
                        onClick={() => {
                          const nextStep: Micro = {
                            id: makeUuid(),
                            title: "",
                            minutes: 0,
                            position: micro.length,
                          };
                          onChangeMicroSteps({
                            ...microStepsByMacroId,
                            [m.id]: [...micro, nextStep],
                          });
                        }}
                      >
                        Add micro
                      </Button>
                    </div>

                    <div className="space-y-2">
                      {micro.length === 0 ? (
                        <div className="rounded-lg border border-dashed border-slate-200 p-3 text-xs text-slate-400">
                          No micro steps yet. Add one to start tracking time.
                        </div>
                      ) : (
                        micro.map((s, idx) => (
                          <div key={s.id} className="grid grid-cols-[1fr_90px_auto] gap-2 items-center">
                            <input
                              value={s.title}
                              onChange={(e) => {
                                const next = micro.map((x) =>
                                  x.id === s.id ? { ...x, title: e.target.value } : x
                                );
                                onChangeMicroSteps({ ...microStepsByMacroId, [m.id]: next });
                              }}
                              placeholder="Micro step"
                              className="h-8 rounded-md border border-slate-200 px-2 text-sm outline-none focus:ring-2 focus:ring-blue-100"
                            />
                            <input
                              value={Number.isFinite(s.minutes) ? s.minutes : 0}
                              onChange={(e) => {
                                const n = e.target.value === "" ? 0 : clampMinutes(Number(e.target.value));
                                const next = micro.map((x) => (x.id === s.id ? { ...x, minutes: n } : x));
                                onChangeMicroSteps({ ...microStepsByMacroId, [m.id]: next });
                              }}
                              type="number"
                              min={0}
                              step={1}
                              className="h-8 rounded-md border border-slate-200 px-2 text-sm outline-none focus:ring-2 focus:ring-blue-100 tabular-nums"
                            />
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                type="button"
                                disabled={idx === 0}
                                onClick={() => {
                                  if (idx === 0) return;
                                  const next = [...micro];
                                  const tmp = next[idx - 1];
                                  next[idx - 1] = { ...next[idx], position: idx - 1 };
                                  next[idx] = { ...tmp, position: idx };
                                  onChangeMicroSteps({ ...microStepsByMacroId, [m.id]: next });
                                }}
                                aria-label="Move micro up"
                              >
                                ↑
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                type="button"
                                disabled={idx === micro.length - 1}
                                onClick={() => {
                                  if (idx === micro.length - 1) return;
                                  const next = [...micro];
                                  const tmp = next[idx + 1];
                                  next[idx + 1] = { ...next[idx], position: idx + 1 };
                                  next[idx] = { ...tmp, position: idx };
                                  onChangeMicroSteps({ ...microStepsByMacroId, [m.id]: next });
                                }}
                                aria-label="Move micro down"
                              >
                                ↓
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                type="button"
                                onClick={() => {
                                  const next = micro.filter((x) => x.id !== s.id).map((x, j) => ({ ...x, position: j }));
                                  onChangeMicroSteps({ ...microStepsByMacroId, [m.id]: next });
                                }}
                                aria-label="Delete micro"
                              >
                                ✕
                              </Button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    <Separator className="bg-slate-100" />
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>{micro.length} micro step(s)</span>
                      <span className="tabular-nums">{minutes} min total</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            );
          })}
      </div>
    </div>
  );
}

