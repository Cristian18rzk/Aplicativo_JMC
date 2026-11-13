// Tipos de la tabla "Colaboradores" en Airtable

export const AREAS = ["Administrativa", "Operativa", "Campo"] as const;
export type Area = (typeof AREAS)[number];

export const TIPOS_CONTRATO = ["Fijo", "Indefinido", "Obra o labor"] as const;
export type TipoContrato = (typeof TIPOS_CONTRATO)[number];

export const ESTADOS_COLABORADOR = ["Activo", "Inactivo", "Retirado"] as const;
export type EstadoColaborador = (typeof ESTADOS_COLABORADOR)[number];

export const ROLES = ["admin", "colaborador"] as const;
export type Rol = (typeof ROLES)[number];

/** Documento de identidad. El número (campo "cedula") es el que se usa para ingresar. */
export const TIPOS_DOCUMENTO = ["CC", "PPT", "CE", "TI"] as const;
export type TipoDocumento = (typeof TIPOS_DOCUMENTO)[number];

export const NOMBRES_DOCUMENTO: Record<TipoDocumento, string> = {
  CC: "Cédula de ciudadanía",
  PPT: "Permiso por protección temporal",
  CE: "Cédula de extranjería",
  TI: "Tarjeta de identidad",
};

/**
 * Colaborador tal como se expone a la aplicación. Solo datos personales y laborales: el aplicativo ya
 * no maneja nómina ni salarios (EPS, pensión, banco, sueldo…).
 */
export interface Colaborador {
  id: string;
  tipo_documento: TipoDocumento;
  /** Número del documento (cédula, PPT, CE o TI). */
  cedula: string;
  /** Ciudad donde se expidió el documento ("Canalete - Córdoba"); aparece en el certificado laboral. */
  lugar_expedicion: string;
  nombres: string;
  apellidos: string;
  cargo: string;
  area: Area;
  fecha_ingreso: string; // YYYY-MM-DD
  tipo_contrato: TipoContrato;
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
