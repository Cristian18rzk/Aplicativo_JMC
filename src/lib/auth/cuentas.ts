import "server-only";
import { ErrorApi } from "@/lib/api";
import { revocarTodosDelUsuario } from "@/lib/airtable/refresh-tokens";
import {
  actualizarUsuario,
  crearUsuario,
  eliminarUsuario,
  getUsuarioPorCedula,
  getUsuarioPorColaborador,
  type UsuarioAuth,
} from "@/lib/airtable/usuarios";
import type { Colaborador } from "@/types/colaborador";

/**
 * Mantiene la cuenta de acceso (tabla "Usuarios") alineada con la ficha del colaborador.
 * La ficha es la fuente de verdad de cédula, nombre, rol y estado; los secretos solo viven en "Usuarios".
 */

/** Lanza 409 si la cédula ya pertenece a la cuenta de otro colaborador o de un admin independiente. */
export async function verificarCedulaDisponible(cedula: string | undefined, colaboradorId?: string): Promise<void> {
  if (!cedula) return;
  const existente = await getUsuarioPorCedula(cedula);
  if (existente && existente.colaboradorId !== colaboradorId) {
    throw new ErrorApi(409, "Ya existe una cuenta de acceso con esa cédula");
  }
}

/**
 * Crea o actualiza la cuenta del colaborador y la devuelve. Una cuenta nueva queda sin PIN: el admin
 * genera un PIN temporal desde la ficha y se lo entrega en persona.
 */
export async function sincronizarCuentaColaborador(colaborador: Colaborador): Promise<UsuarioAuth> {
  const cuenta = await getUsuarioPorColaborador(colaborador.id);
  const datos = {
    cedula: colaborador.cedula,
    email: colaborador.email,
    nombre: `${colaborador.nombres} ${colaborador.apellidos}`.trim(),
    role: colaborador.rol,
    activo: colaborador.estado === "Activo",
  };

  if (!cuenta) return crearUsuario({ ...datos, colaboradorId: colaborador.id });

  const cambioSensible =
    datos.cedula !== cuenta.cedula || datos.role !== cuenta.role || (cuenta.activo && !datos.activo);
  const actualizada = await actualizarUsuario(cuenta.id, datos);
  // Un cambio de cédula, rol o una desactivación cierra las sesiones abiertas
  if (cambioSensible) await revocarTodosDelUsuario(cuenta.id, "admin");
  return actualizada;
}

/** Elimina la cuenta de acceso del colaborador (al eliminar su ficha). */
export async function eliminarCuentaColaborador(colaboradorId: string): Promise<void> {
  const cuenta = await getUsuarioPorColaborador(colaboradorId);
  if (!cuenta) return;
  await revocarTodosDelUsuario(cuenta.id, "admin");
  await eliminarUsuario(cuenta.id);
}
