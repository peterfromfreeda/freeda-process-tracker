export type MicroStep = {
  id: string;
  title: string;
  minutes: number;
};

export type MacroStep = {
  id: string;
  title: string;
  microSteps: MicroStep[];
};

export type ProcessStateV1 = {
  v: 1;
  macros: MacroStep[];
};

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null;
}

function isFiniteNonNegativeNumber(x: unknown): x is number {
  return typeof x === "number" && Number.isFinite(x) && x >= 0;
}

function b64EncodeUnicode(str: string) {
  return btoa(unescape(encodeURIComponent(str)));
}

function b64DecodeUnicode(b64: string) {
  return decodeURIComponent(escape(atob(b64)));
}

export function encodeProcessToParam(state: ProcessStateV1) {
  return encodeURIComponent(b64EncodeUnicode(JSON.stringify(state)));
}

export function decodeProcessFromParam(param: string): ProcessStateV1 | null {
  try {
    const raw = b64DecodeUnicode(decodeURIComponent(param));
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed) || parsed.v !== 1) return null;
    const macros = (parsed as any).macros;
    if (!Array.isArray(macros)) return null;

    const cleanedMacros: MacroStep[] = [];
    for (const m of macros) {
      if (!isRecord(m)) return null;
      const id = typeof m.id === "string" ? m.id : null;
      const title = typeof m.title === "string" ? m.title : "";
      const microSteps = (m as any).microSteps;
      if (!id || !Array.isArray(microSteps)) return null;

      const cleanedMicros: MicroStep[] = [];
      for (const s of microSteps) {
        if (!isRecord(s)) return null;
        const sid = typeof s.id === "string" ? s.id : null;
        const stitle = typeof s.title === "string" ? s.title : "";
        const minutes = (s as any).minutes;
        if (!sid || !isFiniteNonNegativeNumber(minutes)) return null;
        cleanedMicros.push({ id: sid, title: stitle, minutes });
      }

      cleanedMacros.push({ id, title, microSteps: cleanedMicros });
    }

    return { v: 1, macros: cleanedMacros };
  } catch {
    return null;
  }
}

export function clampMinutes(n: number) {
  if (!Number.isFinite(n) || n < 0) return 0;
  return n;
}

export function macroMinutes(m: MacroStep) {
  return m.microSteps.reduce((sum, s) => sum + (Number.isFinite(s.minutes) ? s.minutes : 0), 0);
}

export function totalMinutes(macros: MacroStep[]) {
  return macros.reduce((sum, m) => sum + macroMinutes(m), 0);
}

