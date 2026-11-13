// Datos de prueba reutilizables. Son ficticios: no corresponden a personas reales.
import type { UsuarioAuth } from "@/lib/airtable/usuarios";
import type { SesionUsuario } from "@/types/auth";
import type { Colaborador } from "@/types/colaborador";

/** ID con el formato real de Airtable: "rec" + 14 letras o números. */
export const idAirtable = (nombre: string) => `rec${nombre.padEnd(14, "0").slice(0, 14)}`;

export const IDS = {
  usuario: idAirtable("USUARIO1"),
  otroUsuario: idAirtable("USUARIO2"),
  colaborador: idAirtable("COLABORADOR1"),
  otroColaborador: idAirtable("COLABORADOR2"),
  desprendible: idAirtable("DESPRENDIBLE1"),
  certificado: idAirtable("CERTIFICADO1"),
  refreshToken: idAirtable("REFRESH1"),
} as const;

export function crearUsuario(cambios: Partial<UsuarioAuth> = {}): UsuarioAuth {
  return {
    id: IDS.usuario,
    cedula: "1098765432",
    email: "",
    nombre: "Persona De Prueba",
    role: "colaborador",
    colaboradorId: IDS.colaborador,
    activo: true,
    passwordHash: "hash-del-pin",
    previousPasswordHashes: [],
    debeCambiarPin: false,
    pinTemporalExpira: 0,
    failedLoginAttempts: 0,
    failedWindowStart: 0,
    totalFailedAttempts: 0,
    lockedUntil: 0,
    lockedPermanently: false,
    tokenCambioHash: "",
    tokenCambioExpira: 0,
    lastPasswordChange: 0,
    createdAt: 0,
    ...cambios,
  };
}

export function crearColaborador(cambios: Partial<Colaborador> = {}): Colaborador {
  return {
    id: IDS.colaborador,
    tipo_documento: "CC",
    cedula: "1098765432",
    lugar_expedicion: "Villavicencio - Meta",
    nombres: "Persona",
    apellidos: "De Prueba",
    cargo: "Auxiliar",
    area: "Administrativa",
    fecha_ingreso: "2024-02-01",
    tipo_contrato: "Indefinido",
    estado: "Activo",
    rol: "colaborador",
    email: "",
    telefono: "",
    ...cambios,
  };
}

export const sesionColaborador = (cambios: Partial<SesionUsuario> = {}): SesionUsuario => ({
  usuarioId: IDS.usuario,
  id: IDS.colaborador,
  rol: "colaborador",
  ...cambios,
});

export const sesionAdmin = (cambios: Partial<SesionUsuario> = {}): SesionUsuario => ({
  usuarioId: IDS.otroUsuario,
  id: "",
  rol: "admin",
  ...cambios,
});
