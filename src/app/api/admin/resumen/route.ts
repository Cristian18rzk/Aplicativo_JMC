import { NextResponse, type NextRequest } from "next/server";
import { manejarErrorApi } from "@/lib/api";
import { requerirAdmin } from "@/lib/auth/middleware";
import { calcularResumenAdmin } from "@/lib/resumen";

/** GET /api/admin/resumen — Indicadores del panel del administrador (solo admin). */
export async function GET(request: NextRequest) {
  try {
    await requerirAdmin(request);
    return NextResponse.json(await calcularResumenAdmin(), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return manejarErrorApi(error);
  }
}
