"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
import { useRouter, useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  clampMinutes,
  decodeProcessFromParam,
  encodeProcessToParam,
  macroMinutes,
  totalMinutes,
  type MacroStep,
  type MicroStep,
  type ProcessStateV1,
} from "@/lib/processUrlState";

const STEP_COLORS = [
  "#94a3b8",
  "#64748b",
  "#3b82f6",
  "#6366f1",
  "#1d4ed8",
  "#475569",
];

function makeId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

function createDefaultState(): ProcessStateV1 {
  const fromPrevious = [
    { label: "Context gathering", mid: 40 },
    { label: "Document intake & scoping", mid: 40 },
    { label: "Plan review", mid: 83 },
    { label: "Rules & written doc extraction", mid: 60 },
    { label: "Annotation & cross-checking", mid: 165 },
    { label: "Deliverable formatting & delivery", mid: 60 },
  ];

  return {
    v: 1,
    macros: fromPrevious.map((s) => ({
      id: makeId("macro"),
      title: s.label,
      microSteps: [
        {
          id: makeId("micro"),
          title: "Work",
          minutes: s.mid,
        },
      ],
    })),
  };
}

function MacroTooltip({ active, payload }: any) {
  if (active && payload && payload.length) {
    const d = payload[0].payload as { label: string; minutes: number };
    return (
      <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 shadow-sm text-sm">
        <p className="font-medium text-slate-800 mb-1">{d.label}</p>
        <p className="text-slate-500">{d.minutes} min</p>
      </div>
    );
  }
  return null;
}

function MicroRow({
  micro,
  onChange,
  onDelete,
  onMoveUp,
  onMoveDown,
  disableMoveUp,
  disableMoveDown,
}: {
  micro: MicroStep;
  onChange: (next: MicroStep) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  disableMoveUp: boolean;
  disableMoveDown: boolean;
}) {
  return (
    <div className="grid grid-cols-[1fr_90px_auto] gap-2 items-center">
      <input
        value={micro.title}
        onChange={(e) => onChange({ ...micro, title: e.target.value })}
        placeholder="Micro step"
        className="h-8 rounded-md border border-slate-200 px-2 text-sm outline-none focus:ring-2 focus:ring-blue-100"
      />
      <input
        value={Number.isFinite(micro.minutes) ? micro.minutes : 0}
        onChange={(e) => {
          const n = e.target.value === "" ? 0 : clampMinutes(Number(e.target.value));
          onChange({ ...micro, minutes: n });
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
          onClick={onMoveUp}
          disabled={disableMoveUp}
          aria-label="Move micro step up"
        >
          ↑
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          type="button"
          onClick={onMoveDown}
          disabled={disableMoveDown}
          aria-label="Move micro step down"
        >
          ↓
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          type="button"
          onClick={onDelete}
          aria-label="Delete micro step"
        >
          ✕
        </Button>
      </div>
    </div>
  );
}

function MacroCard({
  macro,
  index,
  onChange,
  onDelete,
  onMoveUp,
  onMoveDown,
  disableMoveUp,
  disableMoveDown,
}: {
  macro: MacroStep;
  index: number;
  onChange: (next: MacroStep) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  disableMoveUp: boolean;
  disableMoveDown: boolean;
}) {
  const color = STEP_COLORS[index % STEP_COLORS.length];
  const minutes = macroMinutes(macro);

  return (
    <Card className="min-w-[360px] w-[360px] flex-shrink-0 border border-slate-200/80 shadow-none rounded-xl">
      <CardHeader className="pb-3 pt-4 px-5">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div
            className="w-6 h-6 rounded-md flex items-center justify-center text-white text-xs font-semibold flex-shrink-0 mt-0.5"
            style={{ backgroundColor: color }}
          >
            {index + 1}
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              type="button"
              onClick={onMoveUp}
              disabled={disableMoveUp}
              aria-label="Move macro step left"
            >
              ←
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              type="button"
              onClick={onMoveDown}
              disabled={disableMoveDown}
              aria-label="Move macro step right"
            >
              →
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              type="button"
              onClick={onDelete}
              aria-label="Delete macro step"
            >
              ✕
            </Button>
          </div>
        </div>

        <input
          value={macro.title}
          onChange={(e) => onChange({ ...macro, title: e.target.value })}
          placeholder="Macro step title"
          className="w-full h-9 rounded-md border border-slate-200 px-2 text-sm font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-blue-100"
        />

        <div className="mt-2 flex items-baseline gap-2">
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-semibold text-slate-800 tabular-nums">
              {minutes}
            </span>
            <span className="text-sm text-slate-400">min</span>
          </div>
          <Badge
            variant="secondary"
            className="text-[10px] px-2 py-0 h-5 bg-slate-50 text-slate-600 border-0"
          >
            Sum of micro steps
          </Badge>
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
              const next: MicroStep = { id: makeId("micro"), title: "", minutes: 0 };
              onChange({ ...macro, microSteps: [...macro.microSteps, next] });
            }}
          >
            Add micro
          </Button>
        </div>

        <div className="space-y-2">
          {macro.microSteps.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-200 p-3 text-xs text-slate-400">
              No micro steps yet. Add one to start tracking time.
            </div>
          ) : (
            macro.microSteps.map((micro, i) => (
              <MicroRow
                key={micro.id}
                micro={micro}
                onChange={(nextMicro) => {
                  const next = [...macro.microSteps];
                  next[i] = nextMicro;
                  onChange({ ...macro, microSteps: next });
                }}
                onDelete={() => {
                  onChange({
                    ...macro,
                    microSteps: macro.microSteps.filter((s) => s.id !== micro.id),
                  });
                }}
                onMoveUp={() => {
                  if (i === 0) return;
                  const next = [...macro.microSteps];
                  const tmp = next[i - 1];
                  next[i - 1] = next[i];
                  next[i] = tmp;
                  onChange({ ...macro, microSteps: next });
                }}
                onMoveDown={() => {
                  if (i >= macro.microSteps.length - 1) return;
                  const next = [...macro.microSteps];
                  const tmp = next[i + 1];
                  next[i + 1] = next[i];
                  next[i] = tmp;
                  onChange({ ...macro, microSteps: next });
                }}
                disableMoveUp={i === 0}
                disableMoveDown={i === macro.microSteps.length - 1}
              />
            ))
          )}
        </div>

        <Separator className="bg-slate-100" />
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>{macro.microSteps.length} micro step(s)</span>
          <span className="tabular-nums">{minutes} min total</span>
        </div>
      </CardContent>
    </Card>
  );
}

export default function ProcessTracker() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialParam = searchParams.get("p");
  const lastWrittenParamRef = useRef<string | null>(null);
  const [macros, setMacros] = useState<MacroStep[]>(() => createDefaultState().macros);
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "failed">("idle");
  const debounceRef = useRef<number | null>(null);

  const derived = useMemo(() => {
    const microCount = macros.reduce((sum, m) => sum + m.microSteps.length, 0);
    const minutes = totalMinutes(macros);
    const chartData = macros.map((m, i) => ({
      name: `S${i + 1}`,
      label: m.title || `Step ${i + 1}`,
      minutes: macroMinutes(m),
      color: STEP_COLORS[i % STEP_COLORS.length],
    }));
    return { microCount, minutes, chartData };
  }, [macros]);

  useEffect(() => {
    if (!initialParam) return;
    if (lastWrittenParamRef.current === initialParam) return;
    const decoded = decodeProcessFromParam(initialParam);
    if (!decoded) return;
    setMacros(decoded.macros);
  }, [initialParam]);

  useEffect(() => {
    const state: ProcessStateV1 = { v: 1, macros };
    const encoded = encodeProcessToParam(state);
    if (encoded === initialParam) return;

    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      lastWrittenParamRef.current = encoded;
      const url = `/?p=${encoded}`;
      router.replace(url, { scroll: false });
    }, 250);

    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [macros, router, initialParam]);

  return (
    <div className="min-h-screen bg-[#fafafa] text-slate-900">
      <div className="max-w-[1400px] mx-auto px-8 py-12">

        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-blue-500" />
            <span className="text-xs font-medium text-slate-400 uppercase tracking-widest">
              Freeda · Process builder
            </span>
          </div>
          <h1 className="text-2xl font-semibold text-slate-900 mb-1">
            Process builder — macro + micro steps
          </h1>
          <p className="text-sm text-slate-400">
            Add micro steps vertically inside macro steps · macro time = sum(micro)
          </p>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-4 gap-4 mb-10">
          <div className="bg-white border border-slate-200/80 rounded-xl px-5 py-4">
            <p className="text-xs text-slate-400 mb-1">Macro steps</p>
            <p className="text-xl font-semibold text-slate-800">{macros.length}</p>
            <p className="text-xs text-slate-400 mt-0.5">Horizontal cards</p>
          </div>
          <div className="bg-white border border-slate-200/80 rounded-xl px-5 py-4">
            <p className="text-xs text-slate-400 mb-1">Micro steps</p>
            <p className="text-xl font-semibold text-slate-800">{derived.microCount}</p>
            <p className="text-xs text-slate-400 mt-0.5">Vertical rows inside each macro</p>
          </div>
          <div className="bg-white border border-slate-200/80 rounded-xl px-5 py-4">
            <p className="text-xs text-slate-400 mb-1">Total time</p>
            <p className="text-xl font-semibold text-slate-800 tabular-nums">
              {derived.minutes} min
            </p>
            <p className="text-xs text-slate-400 mt-0.5">Sum of all micro steps</p>
          </div>
          <div className="bg-white border border-slate-200/80 rounded-xl px-5 py-4 flex flex-col justify-between">
            <div>
              <p className="text-xs text-slate-400 mb-1">Share</p>
              <p className="text-xs text-slate-400 mt-0.5">
                State is stored in the URL
              </p>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(window.location.href);
                    setCopyStatus("copied");
                    window.setTimeout(() => setCopyStatus("idle"), 1500);
                  } catch {
                    setCopyStatus("failed");
                    window.setTimeout(() => setCopyStatus("idle"), 1500);
                  }
                }}
              >
                Copy link
              </Button>
              {copyStatus === "copied" && (
                <span className="text-xs text-slate-400">Copied</span>
              )}
              {copyStatus === "failed" && (
                <span className="text-xs text-slate-400">Copy failed</span>
              )}
            </div>
          </div>
        </div>

        {/* Chart */}
        <div className="bg-white border border-slate-200/80 rounded-xl px-6 pt-6 pb-4 mb-8">
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
              Total: {derived.minutes} min
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart
              data={derived.chartData}
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
              <Tooltip content={<MacroTooltip />} cursor={{ fill: "#f8fafc" }} />
              <Bar dataKey="minutes" radius={[5, 5, 0, 0]} maxBarSize={56}>
                {derived.chartData.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>

          {/* Step labels under chart */}
          <div className="flex items-start justify-between gap-2 mt-3 px-4">
            {macros.slice(0, 8).map((m, i) => (
              <div key={m.id} className="flex-1 min-w-0 text-center">
                <p className="text-[10px] text-slate-400 leading-tight truncate">
                  {m.title || `Step ${i + 1}`}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-slate-800">Macro steps</p>
          <Button
            variant="outline"
            size="sm"
            type="button"
            onClick={() => {
              const next: MacroStep = {
                id: makeId("macro"),
                title: "",
                microSteps: [{ id: makeId("micro"), title: "Work", minutes: 0 }],
              };
              setMacros((prev) => [...prev, next]);
            }}
          >
            Add macro step
          </Button>
        </div>

        {/* Macro cards — horizontal scroll */}
        <div className="flex gap-4 overflow-x-auto pb-6 snap-x snap-mandatory">
          {macros.map((macro, i) => (
            <div key={macro.id} className="snap-start">
              <MacroCard
                macro={macro}
                index={i}
                onChange={(next) => {
                  setMacros((prev) => prev.map((m) => (m.id === macro.id ? next : m)));
                }}
                onDelete={() => {
                  setMacros((prev) => prev.filter((m) => m.id !== macro.id));
                }}
                onMoveUp={() => {
                  if (i === 0) return;
                  setMacros((prev) => {
                    const next = [...prev];
                    const tmp = next[i - 1];
                    next[i - 1] = next[i];
                    next[i] = tmp;
                    return next;
                  });
                }}
                onMoveDown={() => {
                  if (i >= macros.length - 1) return;
                  setMacros((prev) => {
                    const next = [...prev];
                    const tmp = next[i + 1];
                    next[i + 1] = next[i];
                    next[i] = tmp;
                    return next;
                  });
                }}
                disableMoveUp={i === 0}
                disableMoveDown={i === macros.length - 1}
              />
            </div>
          ))}
        </div>

        <p className="text-xs text-slate-400 mt-2">
          Tip: edit titles and minutes — the URL updates automatically so you can share the process.
        </p>
      </div>
    </div>
  );
}
