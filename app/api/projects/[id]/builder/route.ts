import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

type PutBody = {
  microStepsByMacroId: Record<
    string,
    Array<{ id?: string; title: string; minutes: number; position: number }>
  >;
};

function isLikelyUuid(value: string) {
  // Simple check: 36 chars with hyphens in UUID positions
  return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(
    value
  );
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = await params;
  const supabase = supabaseServer();

  const [{ data: macros, error: macroErr }, { data: microSteps, error: microErr }] =
    await Promise.all([
      supabase
        .from("macro_templates")
        .select("id,title,position,created_at")
        .order("position", { ascending: true }),
      supabase
        .from("micro_steps")
        .select("id,macro_template_id,title,minutes,position,updated_at")
        .eq("project_id", projectId)
        .order("position", { ascending: true }),
    ]);

  if (macroErr) return NextResponse.json({ error: macroErr.message }, { status: 500 });
  if (microErr) return NextResponse.json({ error: microErr.message }, { status: 500 });

  const byMacro: Record<string, any[]> = {};
  for (const s of microSteps ?? []) {
    const mid = s.macro_template_id as string;
    byMacro[mid] ||= [];
    byMacro[mid].push({
      id: s.id,
      title: s.title,
      minutes: s.minutes,
      position: s.position,
    });
  }

  return NextResponse.json({
    macros: macros ?? [],
    microStepsByMacroId: byMacro,
  });
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = await params;
  const body = (await req.json().catch(() => null)) as PutBody | null;
  if (!body?.microStepsByMacroId) {
    return NextResponse.json({ error: "microStepsByMacroId required" }, { status: 400 });
  }

  const supabase = supabaseServer();

  // Read current micro steps to compute deletes/updates/inserts.
  const { data: existing, error: readErr } = await supabase
    .from("micro_steps")
    .select("id,macro_template_id")
    .eq("project_id", projectId);
  if (readErr) return NextResponse.json({ error: readErr.message }, { status: 500 });

  const existingIds = new Set((existing ?? []).map((s) => s.id as string));
  const keepIds = new Set<string>();

  const upserts: Array<Record<string, any>> = [];

  for (const [macroId, steps] of Object.entries(body.microStepsByMacroId)) {
    if (!isLikelyUuid(macroId)) {
      // Skip any malformed keys; prevents \"undefined\" from hitting uuid columns.
      continue;
    }
    for (const s of steps) {
      if (s.id) keepIds.add(s.id);
      const base = {
        project_id: projectId,
        macro_template_id: macroId,
        title: s.title ?? "",
        minutes: Math.max(0, Math.round(Number(s.minutes) || 0)),
        position: s.position,
      };
      // Only include id for existing rows; let Postgres generate id for new ones.
      if (s.id) {
        upserts.push({ id: s.id, ...base });
      } else {
        upserts.push(base);
      }
    }
  }

  const toDelete = [...existingIds].filter((id) => !keepIds.has(id));
  if (toDelete.length) {
    const { error: delErr } = await supabase.from("micro_steps").delete().in("id", toDelete);
    if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });
  }

  if (upserts.length) {
    const { error: upsertErr } = await supabase.from("micro_steps").upsert(upserts, {
      onConflict: "id",
    });
    if (upsertErr) return NextResponse.json({ error: upsertErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

