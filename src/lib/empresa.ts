/** Datos de la empresa tomados de variables de entorno (solo servidor). */
export interface DatosEmpresa {
  nombre: string;
  nit: string;
  direccion: string;
  ciudad: string;
  telefono: string;
  representanteLegal: string;
  cargoRepresentante: string;
}

export function obtenerDatosEmpresa(): DatosEmpresa {
  return {
    nombre: process.env.EMPRESA_NOMBRE ?? "JMC S.A.S.",
    nit: process.env.EMPRESA_NIT ?? "",
    direccion: process.env.EMPRESA_DIRECCION ?? "",
    ciudad: process.env.EMPRESA_CIUDAD ?? "",
    telefono: process.env.EMPRESA_TELEFONO ?? "",
    representanteLegal: process.env.EMPRESA_REP_LEGAL ?? "",
    cargoRepresentante: process.env.EMPRESA_CARGO_REP ?? "",
  };
}
