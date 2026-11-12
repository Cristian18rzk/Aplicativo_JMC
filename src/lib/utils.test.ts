import { describe, expect, it } from "vitest";
import {
  describirAntiguedad,
  formatCurrency,
  formatDate,
  formatPeriodo,
  formatTamano,
  iniciales,
  normalizarTexto,
  numeroALetras,
  paginar,
  parseFecha,
  pesosEnLetras,
} from "./utils";

describe("valores en letras (certificados)", () => {
  it.each([
    [0, "CERO"],
    [1, "UN"],
    [21, "VEINTIÚN"],
    [100, "CIEN"],
    [101, "CIENTO UN"],
    [1000, "MIL"],
    [1500, "MIL QUINIENTOS"],
    [21_000, "VEINTIÚN MIL"],
    [100_000, "CIEN MIL"],
    [1_000_000, "UN MILLÓN"],
    [1_423_500, "UN MILLÓN CUATROCIENTOS VEINTITRÉS MIL QUINIENTOS"],
    [2_000_000, "DOS MILLONES"],
  ])("%d → %s", (numero, letras) => {
    expect(numeroALetras(numero)).toBe(letras);
  });

  it("agrega 'DE' solo con millones exactos", () => {
    expect(pesosEnLetras(2_000_000)).toBe("DOS MILLONES DE PESOS M/CTE");
    expect(pesosEnLetras(1_300_000)).toBe("UN MILLÓN TRESCIENTOS MIL PESOS M/CTE");
  });
});

describe("moneda y números", () => {
  it("formatea pesos colombianos sin decimales", () => {
    expect(formatCurrency(1_234_567)).toBe("$1.234.567");
    expect(formatCurrency(-5000)).toBe("-$5.000");
    expect(formatCurrency(1234.6)).toBe("$1.235");
    expect(formatCurrency(null)).toBe("$0");
    expect(formatCurrency(Number.NaN)).toBe("$0");
  });

  it("muestra tamaños de archivo legibles", () => {
    expect(formatTamano(0)).toBe("—");
    expect(formatTamano(532 * 1024)).toBe("532 KB");
    expect(formatTamano(100)).toBe("1 KB");
  });
});

describe("fechas", () => {
  it("una fecha AAAA-MM-DD no se corre un día por la zona horaria", () => {
    const fecha = parseFecha("2026-03-01");
    expect([fecha?.getFullYear(), fecha?.getMonth(), fecha?.getDate()]).toEqual([2026, 2, 1]);
  });

  it("una fecha inválida es null y se muestra como raya", () => {
    expect(parseFecha("no-es-fecha")).toBeNull();
    expect(formatDate("no-es-fecha")).toBe("—");
    expect(formatDate("2026-03-05")).toBe("05/03/2026");
  });

  it("formatea el periodo", () => {
    expect(formatPeriodo("2026-03")).toBe("Marzo 2026");
    expect(formatPeriodo("2026-13")).toBe("2026-13");
  });

  // FALLO CONOCIDO: si el día de ingreso es mayor que los días del mes anterior a la fecha final,
  // los días quedan negativos y se omiten ("1 mes" en vez de "1 mes y 1 día"). Pendiente de decidir el arreglo.
  it.fails("antigüedad de 2026-01-31 a 2026-03-01: 1 mes y 1 día", () => {
    expect(describirAntiguedad("2026-01-31", "2026-03-01")).toBe("1 mes y 1 día");
  });

  it.each([
    ["2024-01-15", "2026-03-20", "2 años, 2 meses y 5 días"],
    ["2026-03-01", "2026-03-01", "0 días"],
    ["2026-03-02", "2026-03-01", "—"],
  ])("antigüedad de %s a %s: %s", (desde, hasta, texto) => {
    expect(describirAntiguedad(desde, hasta)).toBe(texto);
  });
});

describe("texto y listas", () => {
  it("normaliza para buscar sin tildes ni mayúsculas", () => {
    expect(normalizarTexto("  José ÑÚÑEZ ")).toBe("jose nunez");
  });

  it("saca las iniciales", () => {
    expect(iniciales("ana maría gómez")).toBe("AM");
  });

  it("pagina y corrige una página fuera de rango", () => {
    const items = Array.from({ length: 25 }, (_, i) => i);
    expect(paginar(items, 3, 10)).toMatchObject({ datos: [20, 21, 22, 23, 24], totalPaginas: 3, pagina: 3 });
    expect(paginar(items, 99, 10).pagina).toBe(3);
    expect(paginar([], 1, 10)).toMatchObject({ datos: [], totalPaginas: 1 });
  });
});
