#!/usr/bin/env node
/**
 * Crea (o actualiza) un administrador en la tabla "Usuarios". El admin ingresa con su cédula y una
 * contraseña fuerte (no con PIN). También sirve para cambiarle la contraseña a un admin.
 *
 * Uso:
 *   npm run auth:seed -- --cedula=1098765432 --nombre="Nombre Apellido"
 *   (la contraseña se pide oculta en la terminal, o se toma de ADMIN_PASSWORD)
 *
 * Opciones:
 *   --email=admin@empresa.com        Informativo (no se usa para ingresar)
 *   --colaborador=recXXXXXXXXXXXXXX  Vincula la cuenta a una ficha de "Colaboradores"
 *   --forzar                         Si la cédula ya tiene cuenta, la convierte en admin y cambia su contraseña.
 *                                    Con --email también encuentra cuentas antiguas creadas por correo.
 *
 * Variables alternativas: ADMIN_CEDULA, ADMIN_EMAIL, ADMIN_NOMBRE, ADMIN_PASSWORD.
 */
import bcrypt from "bcryptjs";
import { parseArgs } from "node:util";
import { BCRYPT_SALT_ROUNDS, airtable, erroresPolitica, escapar, listarTodo, preguntarOculto } from "./lib-auth.mjs";

const USO =
  '  Uso: npm run auth:seed -- --cedula=1098765432 --nombre="Nombre Apellido" [--email=...] [--colaborador=recXXX] [--forzar]';

let values;
try {
  ({ values } = parseArgs({
    options: {
      cedula: { type: "string" },
      email: { type: "string" },
      nombre: { type: "string" },
      colaborador: { type: "string" },
      forzar: { type: "boolean", default: false },
    },
  }));
} catch (error) {
  console.error(`✖ ${error.message}`);
  console.error(USO);
  process.exit(1);
}

const cedula = (values.cedula ?? process.env.ADMIN_CEDULA ?? "").replace(/[.\s]/g, "");
const email = (values.email ?? process.env.ADMIN_EMAIL ?? "").trim().toLowerCase();
const nombre = (values.nombre ?? process.env.ADMIN_NOMBRE ?? "Administrador").trim();
const colaboradorId = values.colaborador ?? "";

if (!/^\d{5,12}$/.test(cedula)) {
  console.error("✖ Indique una cédula válida (5 a 12 dígitos): --cedula=1098765432 (o ADMIN_CEDULA)");
  console.error(USO);
  process.exit(1);
}
if (email && !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email)) {
  console.error(
    /[<>]/.test(email)
      ? "✖ Escriba el correo sin los signos < >: --email=nombre@dominio.com"
      : "✖ El --email no es válido",
  );
  process.exit(1);
}
if (colaboradorId && !/^rec[a-zA-Z0-9]{14}$/.test(colaboradorId)) {
  console.error("✖ --colaborador debe ser un ID de registro de Airtable (recXXXXXXXXXXXXXX)");
  process.exit(1);
}

async function buscarExistente() {
  const porCedula = await listarTodo("Usuarios", `{cedula} & "" = "${cedula}"`);
  if (porCedula.length) return porCedula[0];
  // Cuentas creadas antes del ingreso por cédula (no tienen el campo cedula)
  if (email) {
    const porEmail = await listarTodo("Usuarios", `LOWER({email}) = "${escapar(email)}"`);
    if (porEmail.length) return porEmail[0];
  }
  return null;
}

async function main() {
  const existente = await buscarExistente();
  if (existente && !values.forzar) {
    console.error(`✖ Ya existe una cuenta con la cédula ${cedula}. Use --forzar para convertirla en admin y cambiar su contraseña.`);
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

  const errores = erroresPolitica(password, { email, nombre, cedula });
  if (errores.length) {
    console.error("✖ La contraseña no cumple la política:");
    errores.forEach((e) => console.error(`  - ${e}`));
    process.exit(1);
  }

  const hash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
  const ahora = new Date().toISOString();
  const campos = {
    cedula,
    nombre,
    role: "admin",
    activo: true,
    password_hash: hash,
    previous_password_hashes: "[]",
    must_change_pin: false,
    temp_pin_expires: null,
    failed_login_attempts: 0,
    total_failed_attempts: 0,
    locked_permanently: false,
    locked_until: null,
    reset_token_hash: null,
    reset_token_expires: null,
    last_password_change: ahora,
    ...(email ? { email } : {}),
    ...(colaboradorId ? { colaborador_id: colaboradorId } : {}),
  };

  if (existente) {
    await airtable(`Usuarios/${existente.id}`, {
      method: "PATCH",
      body: JSON.stringify({ fields: campos, typecast: true }),
    });
    // Cambio de contraseña: se revocan las sesiones abiertas de esa cuenta
    const activos = await listarTodo(
      "refresh_tokens",
      `AND({user_id} = "${existente.id}", {revoked_at} = BLANK())`,
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
    console.log(`✔ Cuenta de la cédula ${cedula} actualizada como administrador (${activos.length} sesiones revocadas)`);
  } else {
    await airtable("Usuarios", {
      method: "POST",
      body: JSON.stringify({ records: [{ fields: { ...campos, created_at: ahora } }], typecast: true }),
    });
    console.log(`✔ Administrador con cédula ${cedula} creado`);
  }
  console.log('  Ingrese en /auth/login con su cédula, pulsando "Soy administrador".');
}

main().catch((error) => {
  console.error("✖", error.message);
  process.exit(1);
});
