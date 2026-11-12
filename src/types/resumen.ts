import type { PlantillaDesprendible } from "./desprendible";

/** Persona en una lista de pendientes del panel. */
export interface PersonaPendiente {
  id: string;
  nombre: string;
  documento: string;
  cargo: string;
}

export interface ListaPendientes {
  total: number;
  /** Los primeros, ordenados por apellido. */
  personas: PersonaPendiente[];
}

export interface AvanceGrupo {
  cargados: number;
  esperados: number;
}

/** Una palma del "lote del mes": un colaborador activo con su situación en el periodo. */
export interface PalmaLote {
  id: string;
  nombre: string;
  plantilla: PlantillaDesprendible;
  /** Tiene al menos un desprendible cargado en el periodo. */
  cargado: boolean;
  /** Situación de su acceso al portal ("admin" para cuentas de administrador). */
  acceso: "con_pin" | "pin_temporal" | "sin_pin" | "bloqueado" | "admin";
}

/** Indicadores del panel del administrador (GET /api/admin/resumen). */
export interface ResumenAdmin {
  periodo: string; // YYYY-MM (hora de Colombia)
  colaboradores: {
    total: number;
    activos: number;
    porArea: { area: string; cantidad: number }[];
  };
  desprendibles: AvanceGrupo & {
    porPlantilla: Record<PlantillaDesprendible, AvanceGrupo>;
    /** Desprendibles cargados en los últimos 6 periodos, del más antiguo al actual. */
    historial: { periodo: string; cantidad: number }[];
  };
  acceso: {
    total: number;
    conPin: number;
    pinTemporal: number;
    sinPin: number;
    bloqueados: number;
  };
  certificados: { total: number; esteMes: number };
  pendientes: {
    sinDesprendible: ListaPendientes;
    sinAcceso: ListaPendientes;
  };
  /** Todos los colaboradores activos, ordenados por apellido, para el mapa del lote. */
  lote: PalmaLote[];
}
