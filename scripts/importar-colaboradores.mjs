#!/usr/bin/env node
/**
 * Importa trabajadores a la tabla "Colaboradores" desde el CSV de la base de personal de JMC
 * (exportado de Excel: separado por ";" y en codificación Windows-1252).
 *
 * Columnas esperadas (en cualquier orden): TP DOCUMENT · CEDULA · NOMBRE (apellidos y nombres) · ESTADO ·
 * FECHA INGRESO (DD/MM/AAAA) · TELEFONO · LABOR. Las demás se ignoran.
 *
 * - El tipo de contrato no viene en el archivo: se usa --contrato (por defecto "Obra o labor").
 * - El salario no viene en el archivo: queda vacío (el certificado omite esa línea).
 * - Omite las cédulas que ya existen en Airtable, así que se puede ejecutar varias veces.
 *
 * Uso:  npm run colaboradores:importar -- "../ejemplos/BASE JMC.csv"            (muestra lo que haría)
 *       npm run colaboradores:importar -- "../ejemplos/BASE JMC.csv" --aplicar
 * Después: npm run auth:migrar -- --aplicar   (crea las cuentas de acceso)
 */
import { readFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { airtable, listarTodo } from "./lib-auth.mjs";

const CONTRATOS = ["Fijo", "Indefinido", "Obra o labor"];
const DOCUMENTOS = ["CC", "PPT", "CE", "TI"];

let values, positionals;
try {
  ({ values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      aplicar: { type: "boolean", default: false },
      contrato: { type: "string", default: "Obra o labor" },
    },
  }));
} catch (error) {
  console.error(`✖ ${error.message}`);
  process.exit(1);
}
const [ruta] = positionals;
if (!ruta) {
  console.error('✖ Indique el archivo: npm run colaboradores:importar -- "ruta/al/archivo.csv" [--aplicar]');
  process.exit(1);
}
if (!CONTRATOS.includes(values.contrato)) {
  console.error(`✖ --contrato debe ser uno de: ${CONTRATOS.join(", ")}`);
  process.exit(1);
}

/** Apellidos con un solo componente en el archivo (no se pueden deducir con la regla de dos apellidos). */
const APELLIDO_UNICO = new Set(["1118199335"]);

const PALABRAS_MINUSCULA = new Set(["de", "del", "la", "las", "los", "y"]);
const tituloCaso = (texto) =>
  texto
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((p, i) => (i > 0 && PALABRAS_MINUSCULA.has(p) ? p : p.charAt(0).toUpperCase() + p.slice(1)))
    .join(" ");

/** "CHURIO MARTINEZ GRISELDA ROSA" → apellidos "Churio Martinez", nombres "Griselda Rosa". */
function separarNombre(completo, cedula) {
  const partes = completo.trim().split(/\s+/);
  const cuantos = APELLIDO_UNICO.has(cedula) || partes.length < 3 ? 1 : 2;
  return { apellidos: tituloCaso(partes.slice(0, cuantos).join(" ")), nombres: tituloCaso(partes.slice(cuantos).join(" ")) };
}

function fechaIso(texto) {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(texto.trim());
  if (!m) return null;
  const [, d, mes, a] = m.map(Number);
  const fecha = new Date(Date.UTC(a, mes - 1, d));
  if (fecha.getUTCMonth() !== mes - 1) return null;
  return fecha.toISOString().slice(0, 10);
}

const normalizarCabecera = (c) =>
  c.normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase().replace(/\s+/g, " ").trim();

function leerCsv(archivo) {
  const crudo = readFileSync(archivo);
  // Excel en español guarda los CSV en Windows-1252; si el archivo es UTF-8 válido, se respeta
  let texto;
  try {
    texto = new TextDecoder("utf-8", { fatal: true }).decode(crudo);
  } catch {
    texto = new TextDecoder("windows-1252").decode(crudo);
  }
  const filas = texto
    .replace(/^﻿/, "")
    .split(/\r?\n/)
    .filter((l) => l.replace(/;/g, "").trim())
    .map((l) => l.split(";").map((c) => c.trim()));
  const indiceCabecera = filas.findIndex((f) => f.map(normalizarCabecera).includes("CEDULA"));
  if (indiceCabecera < 0) throw new Error('No se encontró la fila de encabezados (con la columna "CEDULA")');
  const cabecera = filas[indiceCabecera].map(normalizarCabecera);
  const col = (nombre) => cabecera.indexOf(nombre);
  const indices = {
    tipo: col("TP DOCUMENT"),
    cedula: col("CEDULA"),
    nombre: col("NOMBRE"),
    estado: col("ESTADO"),
    ingreso: col("FECHA INGRESO"),
    telefono: col("TELEFONO"),
    labor: col("LABOR"),
  };
  for (const [clave, i] of Object.entries(indices)) {
    if (i < 0) throw new Error(`Falta la columna "${clave}" en el archivo`);
  }
  return filas.slice(indiceCabecera + 1).map((f, i) => ({ linea: indiceCabecera + i + 2, celdas: f, indices }));
}

function convertir({ celdas, indices }) {
  const v = (clave) => celdas[indices[clave]] ?? "";
  const cedula = v("cedula").replace(/[.\s]/g, "");
  const errores = [];
  if (!/^\d{5,12}$/.test(cedula)) errores.push(`documento inválido "${v("cedula")}"`);
  const tipo = v("tipo").toUpperCase();
  if (!DOCUMENTOS.includes(tipo)) errores.push(`tipo de documento desconocido "${v("tipo")}"`);
  const fecha = fechaIso(v("ingreso"));
  if (!fecha) errores.push(`fecha de ingreso inválida "${v("ingreso")}"`);
  if (!v("nombre")) errores.push("sin nombre");
  if (!v("labor")) errores.push("sin labor (cargo)");
  const estadoArchivo = v("estado").toUpperCase();
  const estado = estadoArchivo === "ACTIVO" ? "Activo" : estadoArchivo === "RETIRADO" ? "Retirado" : estadoArchivo ? "Inactivo" : null;
  if (!estado) errores.push("sin estado");
  const telefono = v("telefono").replace(/\D/g, "");

  const { nombres, apellidos } = separarNombre(v("nombre"), cedula);
  const cargo = tituloCaso(v("labor"));
  return {
    errores,
    campos: {
      tipo_documento: tipo,
      cedula,
      nombres,
      apellidos,
      cargo,
      area: /representante legal/i.test(cargo) ? "Administrativa" : "Campo",
      fecha_ingreso: fecha,
      tipo_contrato: values.contrato,
      estado,
      rol: "colaborador",
      ...(telefono ? { telefono } : {}),
    },
  };
}

async function main() {
  const filas = leerCsv(ruta);
  // Filas de leyenda al final del archivo (p. ej. "CC | CÉDULA DE CIUDADANÍA") no tienen número de documento
  const conDocumento = filas.filter((f) => f.celdas[f.indices.cedula]);
  const existentes = await listarTodo("Colaboradores");
  const cedulasExistentes = new Set(existentes.map((r) => String(r.fields.cedula ?? "").replace(/\D/g, "")));

  const nuevos = [];
  const repetidosArchivo = [];
  const yaExisten = [];
  const conErrores = [];
  const vistos = new Set();

  for (const fila of conDocumento) {
    const { errores, campos } = convertir(fila);
    if (errores.length) {
      conErrores.push(`  línea ${fila.linea}: ${errores.join("; ")}`);
      continue;
    }
    if (vistos.has(campos.cedula)) {
      repetidosArchivo.push(`  línea ${fila.linea}: ${campos.cedula} ${campos.nombres} ${campos.apellidos}`);
      continue;
    }
    vistos.add(campos.cedula);
    if (cedulasExistentes.has(campos.cedula)) {
      yaExisten.push(`  ${campos.cedula} ${campos.nombres} ${campos.apellidos}`);
      continue;
    }
    nuevos.push(campos);
  }

  console.log(`Filas con documento: ${conDocumento.length} · ya en Airtable: ${existentes.length} colaboradores\n`);
  console.log(`Por importar: ${nuevos.length}`);
  for (const c of nuevos) {
    console.log(
      `  + ${c.tipo_documento.padEnd(3)} ${c.cedula.padEnd(11)} ${`${c.apellidos}, ${c.nombres}`.padEnd(38)} ${c.cargo.padEnd(32)} ${c.area.padEnd(14)} ${c.fecha_ingreso}`,
    );
  }
  if (yaExisten.length) console.log(`\nYa existen (se omiten): ${yaExisten.length}\n${yaExisten.join("\n")}`);
  if (repetidosArchivo.length) console.log(`\nRepetidos en el archivo (se omiten): ${repetidosArchivo.length}\n${repetidosArchivo.join("\n")}`);
  if (conErrores.length) console.log(`\nCon errores (se omiten): ${conErrores.length}\n${conErrores.join("\n")}`);

  if (!values.aplicar) {
    console.log("\nNo se aplicó ningún cambio. Ejecute con --aplicar para guardar.");
    return;
  }
  for (let i = 0; i < nuevos.length; i += 10) {
    await airtable("Colaboradores", {
      method: "POST",
      body: JSON.stringify({ records: nuevos.slice(i, i + 10).map((fields) => ({ fields })), typecast: true }),
    });
  }
  console.log(`\n✔ ${nuevos.length} colaboradores importados.`);
  console.log("  Siguiente paso: npm run auth:migrar -- --aplicar   (crea sus cuentas de acceso)");
}

main().catch((error) => {
  console.error("✖", error.message);
  process.exit(1);
});
