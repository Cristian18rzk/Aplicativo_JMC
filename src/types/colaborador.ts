// Tipos de la tabla "Colaboradores" en Airtable

export const AREAS = ["Administrativa", "Operativa", "Campo"] as const;
export type Area = (typeof AREAS)[number];

export const TIPOS_CONTRATO = ["Fijo", "Indefinido", "Obra o labor"] as const;
export type TipoContrato = (typeof TIPOS_CONTRATO)[number];

export const ESTADOS_COLABORADOR = ["Activo", "Inactivo", "Retirado"] as const;
export type EstadoColaborador = (typeof ESTADOS_COLABORADOR)[number];

export const ROLES = ["admin", "colaborador"] as const;
export type Rol = (typeof ROLES)[number];

export const BANCOS = [
  "Bancolombia",
  "Banco de Bogotá",
  "Davivienda",
  "BBVA Colombia",
  "Banco de Occidente",
  "Banco Popular",
  "Banco AV Villas",
  "Banco Caja Social",
  "Banco Agrario",
  "Scotiabank Colpatria",
  "Banco Falabella",
  "Nequi",
  "Daviplata",
  "Otro",
] as const;
export type Banco = (typeof BANCOS)[number];

/** Colaborador tal como se expone a la aplicación (sin datos sensibles de autenticación). */
export interface Colaborador {
  id: string;
  cedula: string;
  nombres: string;
  apellidos: string;
  cargo: string;
  area: Area;
  fecha_ingreso: string; // YYYY-MM-DD
  tipo_contrato: TipoContrato;
  salario_base: number;
  eps: string;
  fondo_pensiones: string;
  arl: string;
  caja_compensacion: string;
  cuenta_bancaria: string;
  banco: string;
  estado: EstadoColaborador;
  rol: Rol;
  email: string;
  telefono: string;
}

export type ColaboradorInput = Omit<Colaborador, "id">;

export interface FiltrosColaboradores {
  pagina?: number;
  porPagina?: number;
  busqueda?: string;
  area?: Area | "";
  estado?: EstadoColaborador | "";
}

export interface ListaPaginada<T> {
  datos: T[];
  total: number;
  pagina: number;
  porPagina: number;
  totalPaginas: number;
}
