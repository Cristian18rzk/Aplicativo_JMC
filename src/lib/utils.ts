import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Combina clases condicionales y resuelve conflictos de Tailwind. */
export function cn(...entradas: ClassValue[]): string {
  return twMerge(clsx(entradas));
}

/** Agrega separadores de miles con punto: 1234567 → "1.234.567". */
function separarMiles(entero: number): string {
  return Math.abs(Math.trunc(entero))
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

/** Formatea un valor en pesos colombianos sin decimales: $1.234.567 */
export function formatCurrency(valor: number | null | undefined): string {
  const numero = Number.isFinite(valor) ? Math.round(valor as number) : 0;
  const signo = numero < 0 ? "-" : "";
  return `${signo}$${separarMiles(numero)}`;
}

/** Formatea un número con separador de miles colombiano. */
export function formatNumber(valor: number | null | undefined): string {
  const numero = Number.isFinite(valor) ? (valor as number) : 0;
  const [entero, decimales] = Math.abs(numero).toString().split(".");
  const signo = numero < 0 ? "-" : "";
  return `${signo}${separarMiles(Number(entero))}${decimales ? `,${decimales.slice(0, 2)}` : ""}`;
}

/**
 * Convierte una fecha a objeto Date respetando fechas "YYYY-MM-DD" como fecha local
 * (evita el corrimiento de un día por zona horaria).
 */
export function parseFecha(fecha: string | Date | null | undefined): Date | null {
  if (!fecha) return null;
  if (fecha instanceof Date) return Number.isNaN(fecha.getTime()) ? null : fecha;
  const soloFecha = /^(\d{4})-(\d{2})-(\d{2})$/.exec(fecha);
  if (soloFecha) {
    return new Date(Number(soloFecha[1]), Number(soloFecha[2]) - 1, Number(soloFecha[3]));
  }
  const d = new Date(fecha);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Formatea una fecha en formato colombiano DD/MM/YYYY. */
export function formatDate(fecha: string | Date | null | undefined): string {
  const d = parseFecha(fecha);
  if (!d) return "—";
  const dia = String(d.getDate()).padStart(2, "0");
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  return `${dia}/${mes}/${d.getFullYear()}`;
}

/** Fecha de hoy en formato YYYY-MM-DD (hora local). */
export function fechaHoyISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Periodo actual en formato YYYY-MM. */
export function periodoActual(): string {
  return fechaHoyISO().slice(0, 7);
}

export const MESES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
] as const;

/** "2026-03" → "Marzo 2026" */
export function formatPeriodo(periodo: string): string {
  const coincide = /^(\d{4})-(\d{2})$/.exec(periodo);
  if (!coincide) return periodo;
  const mes = MESES[Number(coincide[2]) - 1];
  if (!mes) return periodo;
  return `${mes.charAt(0).toUpperCase()}${mes.slice(1)} ${coincide[1]}`;
}

/** "2026-03-05" → "5 de marzo de 2026" */
export function fechaLarga(fecha: string | Date | null | undefined): string {
  const d = parseFecha(fecha);
  if (!d) return "—";
  return `${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`;
}

/**
 * Calcula los días calendario de servicio entre la fecha de ingreso y la fecha final
 * (por defecto hoy), incluyendo ambos extremos.
 */
export function calcularDiasServicio(
  fechaIngreso: string | Date | null | undefined,
  fechaFin: string | Date = new Date(),
): number {
  const inicio = parseFecha(fechaIngreso);
  const fin = parseFecha(fechaFin);
  if (!inicio || !fin) return 0;
  const utcInicio = Date.UTC(inicio.getFullYear(), inicio.getMonth(), inicio.getDate());
  const utcFin = Date.UTC(fin.getFullYear(), fin.getMonth(), fin.getDate());
  const dias = Math.floor((utcFin - utcInicio) / 86_400_000) + 1;
  return Math.max(dias, 0);
}

/** Describe la antigüedad: "2 años, 3 meses y 10 días". */
export function describirAntiguedad(
  fechaIngreso: string | Date | null | undefined,
  fechaFin: string | Date = new Date(),
): string {
  const inicio = parseFecha(fechaIngreso);
  const fin = parseFecha(fechaFin);
  if (!inicio || !fin || fin < inicio) return "—";
  let anios = fin.getFullYear() - inicio.getFullYear();
  let meses = fin.getMonth() - inicio.getMonth();
  let dias = fin.getDate() - inicio.getDate();
  if (dias < 0) {
    meses -= 1;
    dias += new Date(fin.getFullYear(), fin.getMonth(), 0).getDate();
  }
  if (meses < 0) {
    anios -= 1;
    meses += 12;
  }
  const partes: string[] = [];
  if (anios > 0) partes.push(`${anios} ${anios === 1 ? "año" : "años"}`);
  if (meses > 0) partes.push(`${meses} ${meses === 1 ? "mes" : "meses"}`);
  if (dias > 0 || partes.length === 0) partes.push(`${dias} ${dias === 1 ? "día" : "días"}`);
  if (partes.length === 1) return partes[0];
  return `${partes.slice(0, -1).join(", ")} y ${partes[partes.length - 1]}`;
}

// ─── Número a letras (para certificados) ──────────────────────────────

const UNIDADES = [
  "",
  "UN",
  "DOS",
  "TRES",
  "CUATRO",
  "CINCO",
  "SEIS",
  "SIETE",
  "OCHO",
  "NUEVE",
  "DIEZ",
  "ONCE",
  "DOCE",
  "TRECE",
  "CATORCE",
  "QUINCE",
  "DIECISÉIS",
  "DIECISIETE",
  "DIECIOCHO",
  "DIECINUEVE",
  "VEINTE",
  "VEINTIÚN",
  "VEINTIDÓS",
  "VEINTITRÉS",
  "VEINTICUATRO",
  "VEINTICINCO",
  "VEINTISÉIS",
  "VEINTISIETE",
  "VEINTIOCHO",
  "VEINTINUEVE",
];
const DECENAS = ["", "", "", "TREINTA", "CUARENTA", "CINCUENTA", "SESENTA", "SETENTA", "OCHENTA", "NOVENTA"];
const CENTENAS = [
  "",
  "CIENTO",
  "DOSCIENTOS",
  "TRESCIENTOS",
  "CUATROCIENTOS",
  "QUINIENTOS",
  "SEISCIENTOS",
  "SETECIENTOS",
  "OCHOCIENTOS",
  "NOVECIENTOS",
];

function menorQueMil(n: number): string {
  if (n === 0) return "";
  if (n === 100) return "CIEN";
  const c = Math.floor(n / 100);
  const resto = n % 100;
  let texto = CENTENAS[c];
  if (resto > 0) {
    let parteResto: string;
    if (resto < 30) {
      parteResto = UNIDADES[resto];
    } else {
      const d = Math.floor(resto / 10);
      const u = resto % 10;
      parteResto = u === 0 ? DECENAS[d] : `${DECENAS[d]} Y ${UNIDADES[u]}`;
    }
    texto = texto ? `${texto} ${parteResto}` : parteResto;
  }
  return texto;
}

/** Convierte un número entero a letras en español: 1423500 → "UN MILLÓN CUATROCIENTOS VEINTITRÉS MIL QUINIENTOS". */
export function numeroALetras(valor: number): string {
  const n = Math.floor(Math.abs(valor));
  if (n === 0) return "CERO";
  const millones = Math.floor(n / 1_000_000);
  const miles = Math.floor((n % 1_000_000) / 1000);
  const unidades = n % 1000;
  const partes: string[] = [];
  if (millones > 0) {
    partes.push(millones === 1 ? "UN MILLÓN" : `${numeroALetras(millones)} MILLONES`);
  }
  if (miles > 0) {
    partes.push(miles === 1 ? "MIL" : `${menorQueMil(miles)} MIL`);
  }
  if (unidades > 0) partes.push(menorQueMil(unidades));
  return partes.join(" ").replace(/\s+/g, " ").trim();
}

/** "UN MILLÓN DE PESOS M/CTE" (agrega "DE" cuando el número termina en millón/millones exactos). */
export function pesosEnLetras(valor: number): string {
  const n = Math.round(Math.abs(valor));
  const letras = numeroALetras(n);
  const conDe = n >= 1_000_000 && n % 1_000_000 === 0 ? `${letras} DE` : letras;
  return `${conDe} PESOS M/CTE`;
}

/** Enmascara un correo: juan.perez@correo.com → ju*******@correo.com */
export function enmascararEmail(email: string): string {
  const [usuario, dominio] = email.split("@");
  if (!usuario || !dominio) return email;
  const visible = usuario.slice(0, 2);
  return `${visible}${"*".repeat(Math.max(usuario.length - 2, 3))}@${dominio}`;
}

/** Tamaño de archivo legible: 532 KB, 1,4 MB. */
export function formatTamano(bytes: number): string {
  if (!bytes) return "—";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toLocaleString("es-CO", { maximumFractionDigits: 1 })} MB`;
}

/** Pagina un arreglo en memoria. */
export function paginar<T>(items: T[], pagina = 1, porPagina = 10) {
  const total = items.length;
  const totalPaginas = Math.max(1, Math.ceil(total / porPagina));
  const paginaSegura = Math.min(Math.max(1, pagina), totalPaginas);
  const inicio = (paginaSegura - 1) * porPagina;
  return {
    datos: items.slice(inicio, inicio + porPagina),
    total,
    pagina: paginaSegura,
    porPagina,
    totalPaginas,
  };
}

/** Normaliza texto para búsquedas: minúsculas y sin tildes. */
export function normalizarTexto(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

/** Iniciales de un nombre: "Juan Pérez" → "JP" */
export function iniciales(nombre: string): string {
  return nombre
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p.charAt(0).toUpperCase())
    .join("");
}
