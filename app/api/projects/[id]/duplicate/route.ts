import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = supabaseServer();

  const { data: srcProject, error: srcErr } = await supabase
    .from("projects")
    .select("id,name")
    .eq("id", id)
    .single();
  if (srcErr) return NextResponse.json({ error: srcErr.message }, { status: 500 });

  const { data: newProject, error: newErr } = await supabase
    .from("projects")
    .insert({ name: `${srcProject.name} (copy)` })
    .select("id,name,created_at,updated_at")
    .single();
  if (newErr) return NextResponse.json({ error: newErr.message }, { status: 500 });

  const { data: microSteps, error: msErr } = await supabase
    .from("micro_steps")
    .select("macro_template_id,title,minutes,position")
    .eq("project_id", id);
  if (msErr) return NextResponse.json({ error: msErr.message }, { status: 500 });

  if (microSteps && microSteps.length > 0) {
    const { error: insertErr } = await supabase.from("micro_steps").insert(
      microSteps.map((s) => ({
        project_id: newProject.id,
        macro_template_id: s.macro_template_id,
        title: s.title,
        minutes: s.minutes,
        position: s.position,
      }))
    );
    if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 });
  }

  return NextResponse.json({ project: newProject }, { status: 201 });
}

