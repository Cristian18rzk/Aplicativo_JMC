#!/usr/bin/env node
/**
 * Crea el usuario administrador inicial en la tabla "Usuarios".
 *
 * Uso:
 *   npm run auth:seed -- --email=admin@empresa.com --nombre="Nombre Apellido"
 *   (la contraseña se pide oculta en la terminal, o se toma de ADMIN_PASSWORD)
 *
 * Opciones:
 *   --colaborador=recXXXXXXXXXXXXXX  Vincula la cuenta a una ficha de "Colaboradores"
 *   --forzar                         Si el email ya existe, lo convierte en admin y cambia su contraseña
 *
 * Variables alternativas: ADMIN_EMAIL, ADMIN_NOMBRE, ADMIN_PASSWORD.
 */
import bcrypt from "bcryptjs";
import { parseArgs } from "node:util";
import { BCRYPT_SALT_ROUNDS, airtable, erroresPolitica, escapar, listarTodo, preguntarOculto } from "./lib-auth.mjs";

let values;
try {
  ({ values } = parseArgs({
    options: {
      email: { type: "string" },
      nombre: { type: "string" },
      colaborador: { type: "string" },
      forzar: { type: "boolean", default: false },
    },
  }));
} catch (error) {
  console.error(`✖ ${error.message}`);
  console.error('  Uso: npm run auth:seed -- --email=admin@empresa.com --nombre="Nombre Apellido" [--colaborador=recXXX] [--forzar]');
  process.exit(1);
}

const email = (values.email ?? process.env.ADMIN_EMAIL ?? "").trim().toLowerCase();
const nombre = (values.nombre ?? process.env.ADMIN_NOMBRE ?? "Administrador").trim();
const colaboradorId = values.colaborador ?? "";

if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  console.error("✖ Indique un email válido: --email=admin@empresa.com (o ADMIN_EMAIL)");
  process.exit(1);
}
if (colaboradorId && !/^rec[a-zA-Z0-9]{14}$/.test(colaboradorId)) {
  console.error("✖ --colaborador debe ser un ID de registro de Airtable (recXXXXXXXXXXXXXX)");
  process.exit(1);
}

async function main() {
  const existentes = await listarTodo("Usuarios", `LOWER({email}) = "${escapar(email)}"`);
  if (existentes.length && !values.forzar) {
    console.error(`✖ Ya existe una cuenta con ${email}. Use --forzar para convertirla en admin y cambiar su contraseña.`);
    process.exit(1);
  }

  let password = process.env.ADMIN_PASSWORD;
  if (!password) {
    password = await preguntarOculto("Contraseña del administrador: ");
    const confirmacion = await preguntarOculto("Confirme la contraseña: ");
    if (password !== confirmacion) {
      console.error("✖ Las contraseñas no coinciden");
      process.exit(1);
    }
  }

  const errores = erroresPolitica(password, { email, nombre });
  if (errores.length) {
    console.error("✖ La contraseña no cumple la política:");
    errores.forEach((e) => console.error(`  - ${e}`));
    process.exit(1);
  }

  const hash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
  const ahora = new Date().toISOString();
  const campos = {
    email,
    nombre,
    role: "admin",
    activo: true,
    password_hash: hash,
    previous_password_hashes: "[]",
    failed_login_attempts: 0,
    total_failed_attempts: 0,
    locked_permanently: false,
    locked_until: null,
    reset_token_hash: null,
    reset_token_expires: null,
    last_password_change: ahora,
    ...(colaboradorId ? { colaborador_id: colaboradorId } : {}),
  };

  if (existentes.length) {
    await airtable(`Usuarios/${existentes[0].id}`, {
      method: "PATCH",
      body: JSON.stringify({ fields: campos, typecast: true }),
    });
    // Cambio de contraseña: se revocan las sesiones abiertas de esa cuenta
    const activos = await listarTodo(
      "refresh_tokens",
      `AND({user_id} = "${existentes[0].id}", {revoked_at} = BLANK())`,
    );
    for (let i = 0; i < activos.length; i += 10) {
      await airtable("refresh_tokens", {
        method: "PATCH",
        body: JSON.stringify({
          records: activos.slice(i, i + 10).map((r) => ({ id: r.id, fields: { revoked_at: ahora, revoked_reason: "admin" } })),
          typecast: true,
        }),
      });
    }
    console.log(`✔ Cuenta ${email} actualizada como administrador (${activos.length} sesiones revocadas)`);
  } else {
    await airtable("Usuarios", {
      method: "POST",
      body: JSON.stringify({ records: [{ fields: { ...campos, created_at: ahora } }], typecast: true }),
    });
    console.log(`✔ Administrador ${email} creado`);
  }
  console.log("  Inicie sesión en /auth/login");
}

main().catch((error) => {
  console.error("✖", error.message);
  process.exit(1);
});
