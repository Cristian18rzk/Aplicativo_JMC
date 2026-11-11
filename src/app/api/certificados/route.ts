import { NextResponse, type NextRequest } from "next/server";
import * as certificadosDb from "@/lib/airtable/certificados";
import * as colaboradoresDb from "@/lib/airtable/colaboradores";
import * as desprendiblesDb from "@/lib/airtable/desprendibles";
import { ErrorApi, leerJson, leerPaginacion, manejarErrorApi } from "@/lib/api";
import { getUsuarioPorId } from "@/lib/airtable/usuarios";
import { esAdmin, requerirSesion } from "@/lib/auth/middleware";
import { generarCertificadoSchema } from "@/lib/validators/certificado";
import { TIPOS_CERTIFICADO, type ContenidoCertificado, type TipoCertificado } from "@/types/certificado";

/** El JWT no lleva el nombre (solo identificadores): se consulta para dejar constancia de quién generó. */
async function nombreDelUsuario(usuarioId: string): Promise<string> {
  const usuario = await getUsuarioPorId(usuarioId);
  return usuario?.nombre || usuario?.email || "Usuario";
}

/** GET /api/certificados?pagina=&porPagina=&tipo=&colaboradorId= — Admin ve todos; colaborador solo los suyos. */
export async function GET(request: NextRequest) {
  try {
    const usuario = await requerirSesion(request);
    const params = request.nextUrl.searchParams;
    const { pagina, porPagina } = leerPaginacion(params);
    const tipo = params.get("tipo") ?? "";

    const resultado = await certificadosDb.getAll({
      pagina,
      porPagina,
      tipo: (TIPOS_CERTIFICADO as readonly string[]).includes(tipo) ? (tipo as TipoCertificado) : "",
      colaboradorId: esAdmin(usuario) ? (params.get("colaboradorId") ?? "") : usuario.id,
    });
    return NextResponse.json(resultado);
  } catch (error) {
    return manejarErrorApi(error);
  }
}

/**
 * POST /api/certificados — Genera un certificado.
 * El admin puede generarlo para cualquier colaborador; el colaborador solo para sí mismo.
 */
export async function POST(request: NextRequest) {
  try {
    const usuario = await requerirSesion(request);
    const datos = generarCertificadoSchema.parse(await leerJson(request));

    if (!esAdmin(usuario) && datos.colaboradorId !== usuario.id) {
      throw new ErrorApi(403, "Solo puede generar certificados propios");
    }

    const colaborador = await colaboradoresDb.getById(datos.colaboradorId);
    if (!colaborador) throw new ErrorApi(404, "Colaborador no encontrado");

    const contenido: ContenidoCertificado = {
      colaborador: {
        cedula: colaborador.cedula,
        nombres: colaborador.nombres,
        apellidos: colaborador.apellidos,
        cargo: colaborador.cargo,
        area: colaborador.area,
        fecha_ingreso: colaborador.fecha_ingreso,
        tipo_contrato: colaborador.tipo_contrato,
        salario_base: colaborador.salario_base,
        estado: colaborador.estado,
      },
      incluirSalario: datos.incluirSalario,
      dirigidoA: datos.dirigidoA,
      // Un colaborador no puede agregar texto libre a un documento oficial
      textoAdicional: esAdmin(usuario) ? datos.textoAdicional : "",
    };

    if (datos.tipo === "Ingresos y retenciones") {
      const anio = datos.anio ?? new Date().getFullYear() - 1;
      const desprendibles = await desprendiblesDb.getDelAnio(colaborador.id, anio);
      if (desprendibles.length === 0) {
        throw new ErrorApi(422, `No hay desprendibles registrados para el año ${anio}`);
      }
      contenido.ingresos = desprendibles.reduce(
        (acc, d) => ({
          ...acc,
          totalDevengado: acc.totalDevengado + d.total_devengado,
          deduccionSalud: acc.deduccionSalud + d.deduccion_salud,
          deduccionPension: acc.deduccionPension + d.deduccion_pension,
          retencionFuente: acc.retencionFuente + d.retencion_fuente,
        }),
        {
          anio,
          totalDevengado: 0,
          deduccionSalud: 0,
          deduccionPension: 0,
          retencionFuente: 0,
          cantidadDesprendibles: desprendibles.length,
        },
      );
    }

    const certificado = await certificadosDb.create({
      colaboradorId: colaborador.id,
      tipo: datos.tipo,
      contenido,
      generadoPor: `${await nombreDelUsuario(usuario.usuarioId)} (${usuario.rol === "admin" ? "Administrador" : "Autoservicio"})`,
    });
    return NextResponse.json(certificado, { status: 201 });
  } catch (error) {
    return manejarErrorApi(error);
  }
}
