// Lector del PDF del programa de nómina: páginas construidas a mano con la disposición real
// (posiciones tomadas de los PDF de octubre de 2026) y datos ficticios.
import { describe, expect, it } from "vitest";
import { claveExistente, clasificarPaginas } from "./clasificar";
import { aNumero, leerPagina } from "./leer-pagina";
import type { ItemTexto, PaginaLeida, PaginaTexto } from "./tipos";

/** Fragmento de texto: x de inicio, ancho aproximado por carácter y altura y. */
const t = (x: number, y: number, texto: string, xFin = x + texto.length * 4.6): ItemTexto => ({ texto, x, xFin, y });

function paginaCampo(): PaginaTexto {
  return {
    numero: 1,
    ancho: 841.92,
    alto: 595.32,
    items: [
      t(61, 47, "EMPRESA"), t(172, 47, "EMPRESA DE PRUEBA SAS"),
      t(61, 57, "DOCUMENTO"), t(172, 57, "NOMINA CORRESPONDIENTE MES OCTUBRE 2026"),
      t(61, 67, "NOMBRE"), t(172, 67, "PRUEBA PEREZ ANA"), t(508, 67, "CARGO", 534), t(537, 67, "AUXILIAR CAMPO"),
      t(61, 80, "C.C."), t(200, 80, "DESCRIPCIÓN"), t(444, 80, "DEVENGO", 480), t(672, 80, "DEDUCCIÓN", 716),
      t(61, 90, "1.000.000.001"), t(200, 90, "SALARIO PAGADO EL 15 OCTUBRE"), t(459, 90, "$ 400.000", 491),
      t(200, 100, "SALARIO PAGADO EL 30 OCTUBRE"), t(459, 100, "$ 600.000", 491),
      t(200, 110, "APORTE PENSIÓN"), t(672, 110, "$ 40.000", 700),
      t(200, 120, "AUXILIO MEDIO TRANSPORTE"), t(463, 120, "$ 50.000", 491),
      t(61, 187, "CÉDULA:"), t(172, 187, "1.000.000.001"), t(378, 187, "TOTAL"), t(453, 187, "$ 1.050.000", 491), t(672, 187, "$ 40.000", 700),
      t(61, 197, "CUENTA #:"), t(172, 197, "(en blanco)"), t(308, 197, "NETO A PAGAR 30 OCTUBRE"), t(690, 197, "$ 610.000", 721),
      t(174, 222, "SEMA"), t(284, 222, "VALOR"), t(413, 222, "INASIST"), t(494, 222, "PROM/DOM"), t(595, 222, "UNIDAD"),
      t(102, 227, "LABOR"), t(204, 227, "BLOQUE"), t(246, 227, "P.P.R."), t(325, 227, "CANTIDAD"), t(370, 227, "JORNALES"),
      t(449, 227, "VR. TOTAL"), t(539, 227, "$ FESTIVO"), t(676, 227, "SECUENCIA"), t(735, 227, "TOTAL"),
      t(179, 231, "NA"), t(279, 231, "UNITARIO"), t(595, 231, "MEDIDA"), t(640, 231, "RACIMO"),
      t(61, 246, "Cosecha Completa"), t(189, 246, "40", 197), t(200, 246, "B.2 2018", 229), t(257, 246, "9,36", 271),
      t(300, 246, "35,48", 318), t(344, 246, "392,00", 366), t(399, 246, "1,3", 409), t(431, 246, "0,0", 441),
      t(459, 246, "130.197,6", 491), t(581, 246, "RAC.", 598), t(651, 246, "332,1", 669), t(711, 246, "0,0", 721),
      t(743, 246, "130.198", 768),
      t(737, 256, "1.000.000", 768),
    ],
  };
}

function paginaNomina(): PaginaTexto {
  return {
    numero: 2,
    ancho: 612,
    alto: 792,
    items: [
      t(155, 36, "EMPRESA DE PRUEBA SAS"), t(245, 61, "Nit: 900000000"),
      t(179, 76, "Nómina # 221 correspondiente al periodo del"), t(231, 90, "01/10/2026 al 30/10/2026"),
      t(38, 119, "Concepto Nómina"), t(304, 119, "Cantidad", 346), t(356, 119, "V/r. Unitario", 415),
      t(430, 119, "Devengado", 481), t(497, 119, "Deducido", 540),
      t(38, 142, "PRUEBA PEREZ LUIS"), t(410, 142, "NIT", 426), t(441, 142, "70000001", 501),
      t(38, 158, "Cargo:"), t(77, 158, "OPERADOR DE MAQUINARIA"), t(405, 158, "Sueldo Básico", 474), t(493, 158, "1.750.905", 533),
      t(37, 176, "Sueldo"), t(334, 176, "30", 343), t(382, 176, "58.363", 407), t(437, 176, "1.750.905", 473), t(534, 176, "0", 539),
      t(35, 187, "Auxilio de Campo"), t(339, 187, "1", 343), t(378, 187, "159.000", 407), t(444, 187, "159.000", 473), t(534, 187, "0", 539),
      t(35, 198, "Aportes Pension Trabajador"), t(182, 198, "COLPENSIONES"), t(468, 198, "0", 473), t(514, 198, "70.036", 539),
      t(35, 210, "Fondo de Solidaridad"), t(182, 210, "COLPENSIONES"), t(468, 210, "0", 473), t(534, 210, "0", 539),
      t(35, 221, "Anticipo Nómina"), t(468, 221, "0", 473), t(503, 221, "500.000", 539),
      t(21, 279, "Firma del Empleado"), t(334, 279, "Total"), t(432, 279, "1.909.905", 473), t(506, 279, "570.036", 538),
      t(21, 293, "C.C."), t(334, 293, "Neto Pagado"), t(498, 293, "1.339.869", 538),
      t(24, 431, "viernes, 6 de noviembre de 2026"), t(434, 431, "Página 1 de 3"),
    ],
  };
}

describe("aNumero", () => {
  it("convierte los formatos del programa de nómina", () => {
    expect(aNumero("$ 1.137.073")).toBe(1137073);
    expect(aNumero("130.197,6")).toBe(130197.6);
    expect(aNumero("0")).toBe(0);
    expect(aNumero("RAC.")).toBeNaN();
  });
});

describe("leerPagina", () => {
  it("lee el desprendible de campo con sus conceptos, totales y labores", () => {
    const r = leerPagina(paginaCampo());
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.formato).toBe("campo");
    const c = r.contenido;
    expect(c.periodo).toBe("2026-10");
    expect(c.colaborador).toMatchObject({ nombre: "PRUEBA PEREZ ANA", documento: "1000000001", cargo: "AUXILIAR CAMPO" });
    expect(c.devengados.map((d) => d.valor)).toEqual([400000, 600000, 50000]);
    expect(c.deducciones).toEqual([{ concepto: "APORTE PENSIÓN", valor: 40000 }]);
    expect([c.totalDevengado, c.totalDeducciones, c.neto]).toEqual([1050000, 40000, 610000]);
    expect(c).toMatchObject({ totalLabores: "1.000.000", etiquetaNeto: "NETO A PAGAR 30 OCTUBRE", cuenta: "(en blanco)" });
    expect(c.labores).toHaveLength(1);
    expect(c.labores?.[0]).toMatchObject({
      labor: "Cosecha Completa",
      semana: "40",
      bloque: "B.2 2018",
      ppr: "9,36",
      valorUnitario: "35,48",
      cantidad: "392,00",
      jornales: "1,3",
      unidad: "RAC.",
      valorRacimo: "332,1",
      total: "130.198",
    });
  });

  it("lee el comprobante de las nóminas 220/221 con entidades y valores unitarios", () => {
    const r = leerPagina(paginaNomina());
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.formato).toBe("nomina");
    const c = r.contenido;
    expect(c).toMatchObject({
      periodo: "2026-10",
      fechaInicio: "2026-10-01",
      fechaFin: "2026-10-30",
      numeroNomina: "221",
      fechaEmision: "2026-11-06",
      totalDevengado: 1909905,
      totalDeducciones: 570036,
      neto: 1339869,
    });
    expect(c.colaborador).toMatchObject({ tipo_documento: "NIT", documento: "70000001", cargo: "OPERADOR DE MAQUINARIA", salarioBasico: 1750905 });
    expect(c.devengados[0]).toEqual({ concepto: "Sueldo", cantidad: "30", valorUnitario: 58363, valor: 1750905 });
    expect(c.deducciones).toEqual([
      { concepto: "Aportes Pension Trabajador", entidad: "COLPENSIONES", valor: 70036 },
      { concepto: "Fondo de Solidaridad", entidad: "COLPENSIONES", valor: 0 },
      { concepto: "Anticipo Nómina", valor: 500000 },
    ]);
  });

  it("rechaza una página que no es del programa de nómina", () => {
    const r = leerPagina({ numero: 3, ancho: 612, alto: 792, items: [t(40, 40, "Factura de venta")] });
    expect(r.ok).toBe(false);
  });
});

describe("clasificarPaginas", () => {
  const ficha = (id: string, cedula: string, area: "Campo" | "Administrativa" | "Operativa") => ({
    id,
    cedula,
    area,
    nombres: "Persona",
    apellidos: id,
  });
  const campo = leerPagina(paginaCampo()) as Extract<PaginaLeida, { ok: true }>;
  const nomina = leerPagina(paginaNomina()) as Extract<PaginaLeida, { ok: true }>;

  it("asigna por documento y respeta el área de la ficha", () => {
    const [a, b] = clasificarPaginas(
      [campo, nomina],
      [ficha("recCampo", "1000000001", "Campo"), ficha("recOper", "70000001", "Operativa")],
      new Set(),
    );
    expect(a).toMatchObject({ estado: "listo", colaboradorId: "recCampo", plantilla: "colaborador" });
    expect(b).toMatchObject({ estado: "listo", colaboradorId: "recOper", plantilla: "administrativo" });
    expect(a.contenido?.colaborador.area).toBe("Campo");
  });

  it("omite la página de campo de un administrativo u operador y marca para revisar la 220/221 de alguien de Campo", () => {
    const [a, b] = clasificarPaginas(
      [campo, nomina],
      [ficha("recAdm", "1000000001", "Administrativa"), ficha("recCampo", "70000001", "Campo")],
      new Set(),
    );
    expect(a.estado).toBe("omitido");
    expect(b.estado).toBe("revisar");
  });

  it("avisa las páginas sin ficha, las ya cargadas, las repetidas y las que están en $0", () => {
    const enCero = { ...campo, contenido: { ...campo.contenido, devengados: [], deducciones: [], totalDevengado: 0, totalDeducciones: 0, neto: 0 } };
    const fichas = [ficha("recCampo", "1000000001", "Campo")];
    expect(clasificarPaginas([nomina], fichas, new Set())[0].estado).toBe("sin_ficha");
    expect(clasificarPaginas([campo], fichas, new Set([claveExistente("recCampo", "2026-10")]))[0].estado).toBe("ya_cargado");
    expect(clasificarPaginas([campo, campo], fichas, new Set()).map((p) => p.estado)).toEqual(["listo", "revisar"]);
    expect(clasificarPaginas([enCero], fichas, new Set())[0].estado).toBe("omitido");
  });

  it("marca para revisar cuando los conceptos no suman el total impreso", () => {
    const descuadrada = { ...campo, contenido: { ...campo.contenido, totalDevengado: 900000 } };
    const [p] = clasificarPaginas([descuadrada], [ficha("recCampo", "1000000001", "Campo")], new Set());
    expect(p.estado).toBe("revisar");
  });
});
