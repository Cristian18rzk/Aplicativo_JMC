#!/usr/bin/env node
/**
 * Prepara las cuentas de acceso ("Usuarios") para el ingreso con cédula + PIN:
 *  - Crea la cuenta de cada colaborador que aún no tenga una (ya no hace falta correo).
 *  - Completa la cédula en las cuentas creadas antes, cuando se ingresaba con correo.
 * Las cuentas nuevas quedan SIN PIN: el admin genera un PIN temporal desde la ficha de cada
 * colaborador y se lo entrega en persona. No modifica contraseñas existentes.
 *
 * Uso:  npm run auth:migrar            (muestra lo que haría)
 *       npm run auth:migrar -- --aplicar
 */
import { parseArgs } from "node:util";
import { airtable, listarTodo } from "./lib-auth.mjs";

const { values } = parseArgs({ options: { aplicar: { type: "boolean", default: false } } });

const soloDigitos = (v) => String(v ?? "").replace(/\D/g, "");

async function enLotes(metodo, registros) {
  for (let i = 0; i < registros.length; i += 10) {
    await airtable("Usuarios", { method: metodo, body: JSON.stringify({ records: registros.slice(i, i + 10), typecast: true }) });
  }
}

async function main() {
  const [colaboradores, usuarios] = await Promise.all([listarTodo("Colaboradores"), listarTodo("Usuarios")]);
  const cuentaPorColaborador = new Map(usuarios.filter((u) => u.fields.colaborador_id).map((u) => [u.fields.colaborador_id, u]));
  const duenoCedula = new Map(
    usuarios.filter((u) => soloDigitos(u.fields.cedula)).map((u) => [soloDigitos(u.fields.cedula), u.fields.colaborador_id ?? ""]),
  );

  const nuevas = [];
  const completar = [];
  const omitidos = [];

  for (const c of colaboradores) {
    const f = c.fields;
    const cedula = soloDigitos(f.cedula);
    const nombre = `${f.nombres ?? ""} ${f.apellidos ?? ""}`.trim();
    if (!/^\d{5,12}$/.test(cedula)) {
      omitidos.push(`${nombre || c.id} (cédula inválida o vacía: "${f.cedula ?? ""}")`);
      continue;
    }
    const dueno = duenoCedula.get(cedula);
    if (dueno !== undefined && dueno !== c.id) {
      omitidos.push(`${nombre} (la cédula ${cedula} ya pertenece a otra cuenta)`);
      continue;
    }

    const cuenta = cuentaPorColaborador.get(c.id);
    if (cuenta) {
      if (soloDigitos(cuenta.fields.cedula) !== cedula) {
        completar.push({ id: cuenta.id, fields: { cedula } });
        duenoCedula.set(cedula, c.id);
      }
      continue;
    }

    duenoCedula.set(cedula, c.id);
    const email = String(f.email ?? "").trim().toLowerCase();
    nuevas.push({
      fields: {
        cedula,
        ...(email ? { email } : {}),
        nombre,
        role: f.rol === "admin" ? "admin" : "colaborador",
        colaborador_id: c.id,
        activo: (f.estado ?? "Activo") === "Activo",
        previous_password_hashes: "[]",
        must_change_pin: false,
        failed_login_attempts: 0,
        total_failed_attempts: 0,
        locked_permanently: false,
        created_at: new Date().toISOString(),
      },
    });
  }

  const sinCedula = usuarios.filter((u) => !u.fields.colaborador_id && !soloDigitos(u.fields.cedula));

  console.log(`Colaboradores: ${colaboradores.length} · cuentas existentes: ${usuarios.length}`);
  console.log(`Cuentas por crear: ${nuevas.length}`);
  nuevas.forEach((n) => console.log(`  + ${n.fields.cedula} ${n.fields.nombre} (${n.fields.role}${n.fields.activo ? "" : ", inactiva"})`));
  console.log(`Cuentas a las que se les completa la cédula: ${completar.length}`);
  if (omitidos.length) {
    console.log(`Omitidos: ${omitidos.length}`);
    omitidos.forEach((o) => console.log(`  - ${o}`));
  }
  if (sinCedula.length) {
    console.log(`\n⚠ ${sinCedula.length} cuenta(s) sin ficha de colaborador y sin cédula (admins antiguos):`);
    sinCedula.forEach((u) => console.log(`  - ${u.fields.email ?? u.id}`));
    console.log('  No podrán ingresar. Asígneles cédula con: npm run auth:seed -- --cedula=... --email=<su correo> --forzar');
  }

  if (!values.aplicar) {
    console.log("\nNo se aplicó ningún cambio. Ejecute con --aplicar para guardar.");
    return;
  }
  await enLotes("POST", nuevas);
  await enLotes("PATCH", completar);
  console.log(`\n✔ ${nuevas.length} cuentas creadas y ${completar.length} completadas.`);
  console.log("  Genere el PIN temporal de cada colaborador desde su ficha en /admin/colaboradores.");
}

main().catch((error) => {
  console.error("✖", error.message);
  process.exit(1);
});
