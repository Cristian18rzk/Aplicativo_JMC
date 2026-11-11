import "server-only";
import { ErrorApi } from "@/lib/api";
import { revocarTodosDelUsuario } from "@/lib/airtable/refresh-tokens";
import {
  actualizarUsuario,
  crearUsuario,
  eliminarUsuario,
  getUsuarioPorColaborador,
  getUsuarioPorEmail,
} from "@/lib/airtable/usuarios";
import type { Colaborador } from "@/types/colaborador";

/**
 * Mantiene la cuenta de acceso (tabla "Usuarios") alineada con la ficha del colaborador.
 * La ficha es la fuente de verdad de email, nombre, rol y estado; los secretos solo viven en "Usuarios".
 */

/** Lanza 409 si el email ya pertenece a la cuenta de otro colaborador o de un admin independiente. */
export async function verificarEmailDisponible(email: string, colaboradorId?: string): Promise<void> {
  if (!email) return;
  const existente = await getUsuarioPorEmail(email);
  if (existente && existente.colaboradorId !== colaboradorId) {
    throw new ErrorApi(409, "Ya existe una cuenta de acceso con ese correo electrónico");
  }
}

/**
 * Crea o actualiza la cuenta del colaborador. Una cuenta nueva queda sin contraseña: el colaborador
 * la crea desde /auth/forgot-password con su correo registrado.
 */
export async function sincronizarCuentaColaborador(colaborador: Colaborador): Promise<void> {
  const cuenta = await getUsuarioPorColaborador(colaborador.id);
  const nombre = `${colaborador.nombres} ${colaborador.apellidos}`.trim();
  const activo = colaborador.estado === "Activo" && Boolean(colaborador.email);

  if (!cuenta) {
    if (!colaborador.email) return; // sin correo no hay forma de ingresar ni de recuperar la cuenta
    await crearUsuario({
      email: colaborador.email,
      nombre,
      role: colaborador.rol,
      colaboradorId: colaborador.id,
      activo,
    });
    return;
  }

  const cambios = {
    email: colaborador.email || cuenta.email,
    nombre,
    role: colaborador.rol,
    activo,
  };
  const cambioSensible =
    cambios.email !== cuenta.email || cambios.role !== cuenta.role || (cuenta.activo && !activo);

  await actualizarUsuario(cuenta.id, cambios);
  // Un cambio de correo, rol o una desactivación cierra las sesiones abiertas
  if (cambioSensible) await revocarTodosDelUsuario(cuenta.id, "admin");
}

/** Elimina la cuenta de acceso del colaborador (al eliminar su ficha). */
export async function eliminarCuentaColaborador(colaboradorId: string): Promise<void> {
  const cuenta = await getUsuarioPorColaborador(colaboradorId);
  if (!cuenta) return;
  await revocarTodosDelUsuario(cuenta.id, "admin");
  await eliminarUsuario(cuenta.id);
}
