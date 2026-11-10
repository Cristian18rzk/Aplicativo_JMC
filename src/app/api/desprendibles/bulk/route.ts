import { NextResponse, type NextRequest } from "next/server";
import * as colaboradoresDb from "@/lib/airtable/colaboradores";
import * as desprendiblesDb from "@/lib/airtable/desprendibles";
import { leerJson, manejarErrorApi } from "@/lib/api";
import { requerirAdmin } from "@/lib/auth/middleware";
import { calcularAportesLey } from "@/lib/nomina";
import { desprendibleBulkRowSchema, desprendibleBulkSchema } from "@/lib/validators/desprendible";
import type { Colaborador } from "@/types/colaborador";
import type { DesprendibleInput, ErrorFilaBulk, ResultadoBulk } from "@/types/desprendible";

// El cargue masivo puede tardar (lotes de 10 registros contra Airtable)
export const maxDuration = 60;

/**
 * POST /api/desprendibles/bulk — Cargue masivo desde un arreglo de filas ya parseadas del Excel/CSV.
 * Cuerpo: { filas: DesprendibleBulkRow[], calcularAportes?: boolean }
 * Las filas válidas se crean; las inválidas se reportan con su número de fila (según el archivo, encabezado = fila 1).
 */
export async function POST(request: NextRequest) {
  try {
    await requerirAdmin(request);
    const { filas, calcularAportes } = desprendibleBulkSchema.parse(await leerJson(request));

    const [mapaColaboradores, existentes] = await Promise.all([
      colaboradoresDb.getMapa(),
      desprendiblesDb.getAll({ porPagina: Number.MAX_SAFE_INTEGER }),
    ]);

    const porCedula = new Map<string, Colaborador>();
    for (const c of mapaColaboradores.values()) porCedula.set(c.cedula, c);

    const clave = (colaboradorId: string, periodo: string, tipo: string) => `${colaboradorId}|${periodo}|${tipo}`;
    const clavesUsadas = new Set(existentes.datos.map((d) => clave(d.colaboradorId, d.periodo, d.tipo_periodo)));

    const errores: ErrorFilaBulk[] = [];
    const aCrear: DesprendibleInput[] = [];

    filas.forEach((filaCruda, indice) => {
      const objeto = typeof filaCruda === "object" && filaCruda !== null ? (filaCruda as Record<string, unknown>) : {};
      // Número de fila del archivo original si el cliente lo envía; si no, posición + encabezado
      const numeroFila =
        typeof objeto.fila === "number" && Number.isInteger(objeto.fila) ? objeto.fila : indice + 2;
      const cedulaCruda = String(objeto.cedula ?? "");

      const resultado = desprendibleBulkRowSchema.safeParse(filaCruda);
      if (!resultado.success) {
        const mensaje = resultado.error.issues
          .map((i) => (i.path.length ? `${String(i.path[0])}: ${i.message}` : i.message))
          .join("; ");
        errores.push({ fila: numeroFila, cedula: cedulaCruda, mensaje });
        return;
      }

      const fila = resultado.data;
      const colaborador = porCedula.get(fila.cedula);
      if (!colaborador) {
        errores.push({ fila: numeroFila, cedula: fila.cedula, mensaje: "No existe un colaborador con esta cédula" });
        return;
      }

      const llave = clave(colaborador.id, fila.periodo, fila.tipo_periodo);
      if (clavesUsadas.has(llave)) {
        errores.push({
          fila: numeroFila,
          cedula: fila.cedula,
          mensaje: `Ya existe un desprendible ${fila.tipo_periodo} del periodo ${fila.periodo}`,
        });
        return;
      }
      clavesUsadas.add(llave);

      const valores = {
        salario_base: fila.salario_base ?? colaborador.salario_base,
        dias_trabajados: fila.dias_trabajados,
        horas_extras_diurnas: fila.horas_extras_diurnas,
        horas_extras_nocturnas: fila.horas_extras_nocturnas,
        recargos_nocturnos: fila.recargos_nocturnos,
        dominicales_festivos: fila.dominicales_festivos,
        auxilio_transporte: fila.auxilio_transporte,
        otros_devengados: fila.otros_devengados,
        deduccion_salud: fila.deduccion_salud ?? 0,
        deduccion_pension: fila.deduccion_pension ?? 0,
        retencion_fuente: fila.retencion_fuente,
        otros_descuentos: fila.otros_descuentos,
      };

      if (calcularAportes) {
        const aportes = calcularAportesLey(valores);
        if (fila.deduccion_salud === undefined) valores.deduccion_salud = aportes.salud;
        if (fila.deduccion_pension === undefined) valores.deduccion_pension = aportes.pension;
      }

      aCrear.push({
        colaboradorId: colaborador.id,
        periodo: fila.periodo,
        tipo_periodo: fila.tipo_periodo,
        descripcion_otros: fila.descripcion_otros ?? "",
        descripcion_descuentos: fila.descripcion_descuentos ?? "",
        ...valores,
      });
    });

    const creados = aCrear.length ? await desprendiblesDb.createBulk(aCrear) : 0;
    const resultado: ResultadoBulk = { creados, errores };
    return NextResponse.json(resultado, { status: creados > 0 ? 201 : 200 });
  } catch (error) {
    return manejarErrorApi(error);
  }
}
