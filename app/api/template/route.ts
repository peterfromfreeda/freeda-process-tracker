import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export async function GET() {
  const supabase = supabaseServer();
  const { data, error } = await supabase
    .from("macro_templates")
    .select("id,title,position,created_at")
    .order("position", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ macros: data ?? [] });
}

export async function PATCH(req: Request) {
  const body = (await req.json().catch(() => null)) as
    | { macros?: Array<{ id: string; title: string; position: number }> }
    | null;
  if (!body?.macros) return NextResponse.json({ error: "macros required" }, { status: 400 });

  const supabase = supabaseServer();
  const { error } = await supabase.from("macro_templates").upsert(
    body.macros.map((m) => ({
      id: m.id,
      title: m.title ?? "",
      position: m.position,
    })),
    { onConflict: "id" }
  );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

