#!/usr/bin/env node
/**
 * Crea las cuentas de acceso ("Usuarios") de los colaboradores que ya existían antes del login con
 * contraseña. Las cuentas quedan SIN contraseña: cada colaborador la crea desde
 * /auth/forgot-password con su correo registrado. No envía correos.
 *
 * Uso:  npm run auth:migrar            (muestra lo que haría)
 *       npm run auth:migrar -- --aplicar
 */
import { parseArgs } from "node:util";
import { airtable, listarTodo } from "./lib-auth.mjs";

const { values } = parseArgs({ options: { aplicar: { type: "boolean", default: false } } });

async function main() {
  const [colaboradores, usuarios] = await Promise.all([listarTodo("Colaboradores"), listarTodo("Usuarios")]);
  const porColaborador = new Set(usuarios.map((u) => u.fields.colaborador_id).filter(Boolean));
  const porEmail = new Set(usuarios.map((u) => String(u.fields.email ?? "").toLowerCase()).filter(Boolean));

  const nuevos = [];
  const omitidos = [];
  for (const c of colaboradores) {
    const f = c.fields;
    const email = String(f.email ?? "").trim().toLowerCase();
    const nombre = `${f.nombres ?? ""} ${f.apellidos ?? ""}`.trim();
    if (porColaborador.has(c.id)) continue;
    if (!email) {
      omitidos.push(`${nombre} (sin correo)`);
      continue;
    }
    if (porEmail.has(email)) {
      omitidos.push(`${nombre} (el correo ${email} ya tiene cuenta)`);
      continue;
    }
    porEmail.add(email);
    nuevos.push({
      fields: {
        email,
        nombre,
        role: f.rol === "admin" ? "admin" : "colaborador",
        colaborador_id: c.id,
        activo: (f.estado ?? "Activo") === "Activo",
        previous_password_hashes: "[]",
        failed_login_attempts: 0,
        total_failed_attempts: 0,
        locked_permanently: false,
        created_at: new Date().toISOString(),
      },
    });
  }

  console.log(`Colaboradores: ${colaboradores.length} · cuentas existentes: ${usuarios.length}`);
  console.log(`Cuentas por crear: ${nuevos.length}`);
  nuevos.forEach((n) => console.log(`  + ${n.fields.email} (${n.fields.role}${n.fields.activo ? "" : ", inactiva"})`));
  if (omitidos.length) {
    console.log(`Omitidos: ${omitidos.length}`);
    omitidos.forEach((o) => console.log(`  - ${o}`));
  }

  if (!values.aplicar) {
    console.log("\nNo se aplicó ningún cambio. Ejecute con --aplicar para crear las cuentas.");
    return;
  }
  for (let i = 0; i < nuevos.length; i += 10) {
    await airtable("Usuarios", { method: "POST", body: JSON.stringify({ records: nuevos.slice(i, i + 10), typecast: true }) });
  }
  console.log(`\n✔ ${nuevos.length} cuentas creadas. Cada colaborador debe crear su contraseña en /auth/forgot-password.`);
}

main().catch((error) => {
  console.error("✖", error.message);
  process.exit(1);
});
