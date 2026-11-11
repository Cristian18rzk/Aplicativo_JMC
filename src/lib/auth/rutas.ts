/** Rutas por rol (módulo sin dependencias: se usa en proxy, servidor y cliente). */

export function inicioSegunRol(rol: string): string {
  return rol === "admin" ? "/admin" : "/colaborador";
}

/** Destino interno seguro tras el login: evita redirecciones abiertas y secciones de otro rol. */
export function destinoSeguro(redirigir: string | null | undefined, rol: string): string {
  const inicio = inicioSegunRol(rol);
  if (!redirigir || !redirigir.startsWith("/") || redirigir.startsWith("//") || redirigir.includes("\\")) {
    return inicio;
  }
  return redirigir === inicio || redirigir.startsWith(`${inicio}/`) ? redirigir : inicio;
}
