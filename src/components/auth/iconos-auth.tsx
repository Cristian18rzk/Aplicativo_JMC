import type { SVGProps } from "react";

/*
 * Íconos propios de las pantallas de ingreso: trazo redondeado de 1.75, minimalistas y con guiños
 * a la marca (el sol que sale, los puntos del PIN). Todos usan currentColor y son decorativos.
 */

type Props = SVGProps<SVGSVGElement>;

function Base({ children, ...props }: Props) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  );
}

/** Sol saliendo sobre el horizonte, con una puerta abierta en él: "entrar". */
export function IconoAmanecer(props: Props) {
  return (
    <Base {...props}>
      <path d="M3 17h18" />
      <path d="M7.5 17a4.5 4.5 0 0 1 9 0" />
      <path d="M12 6.5V8.5M6.2 9.2l1.3 1.3M17.8 9.2l-1.3 1.3M4 13.4h1.6M18.4 13.4H20" />
      <path d="M8 20.5h8" opacity={0.55} />
    </Base>
  );
}

/** Documento de identidad con franja superior y silueta: la cédula. */
export function IconoCedula(props: Props) {
  return (
    <Base {...props}>
      <rect x="3" y="5" width="18" height="14" rx="3" />
      <path d="M3 9h18" opacity={0.55} />
      <circle cx="8.5" cy="13.4" r="1.6" />
      <path d="M6 17c.5-1.1 1.4-1.6 2.5-1.6S10.5 15.9 11 17" />
      <path d="M14 13h4M14 16h2.5" />
    </Base>
  );
}

/** Cuatro puntos dentro de una cápsula: el PIN de 4 números. */
export function IconoPin(props: Props) {
  return (
    <Base {...props}>
      <rect x="2.5" y="7" width="19" height="10" rx="5" />
      <circle cx="7.2" cy="12" r="0.9" fill="currentColor" />
      <circle cx="10.4" cy="12" r="0.9" fill="currentColor" />
      <circle cx="13.6" cy="12" r="0.9" fill="currentColor" />
      <path d="M16.8 10.4v3.2" />
    </Base>
  );
}

/** Ojo abierto con la pupila como un pequeño sol. */
export function IconoOjo(props: Props) {
  return (
    <Base {...props}>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="2.6" />
      <circle cx="12" cy="12" r="0.6" fill="currentColor" />
    </Base>
  );
}

/** Ojo cerrado: párpado con pestañas. */
export function IconoOjoCerrado(props: Props) {
  return (
    <Base {...props}>
      <path d="M3 10.5S6.5 15.5 12 15.5 21 10.5 21 10.5" />
      <path d="M12 15.5V18M7.2 14.2 5.8 16.2M16.8 14.2l1.4 2" />
    </Base>
  );
}

/** Flecha de avance con un trazo de impulso. */
export function IconoAvanzar(props: Props) {
  return (
    <Base {...props}>
      <path d="M4 12h12.5" />
      <path d="M12.5 7l5 5-5 5" />
      <path d="M20.5 9v6" opacity={0.55} />
    </Base>
  );
}

/** Flecha de regreso (espejo de la de avance). */
export function IconoRegresar(props: Props) {
  return (
    <Base {...props}>
      <path d="M20 12H7.5" />
      <path d="M11.5 7l-5 5 5 5" />
      <path d="M3.5 9v6" opacity={0.55} />
    </Base>
  );
}

/** Llave cuyo ojo lleva los puntos del PIN: recuperar el PIN. */
export function IconoLlavePin(props: Props) {
  return (
    <Base {...props}>
      <circle cx="8" cy="12" r="4.5" />
      <circle cx="6.6" cy="12" r="0.8" fill="currentColor" />
      <circle cx="9.4" cy="12" r="0.8" fill="currentColor" />
      <path d="M12.5 12H21M18 12v3M21 12v2" />
    </Base>
  );
}

/** Escudo con los puntos del PIN dentro: crear un PIN seguro. */
export function IconoEscudoPin(props: Props) {
  return (
    <Base {...props}>
      <path d="M12 3 4.5 6v5.5c0 4.4 3.1 8 7.5 9.5 4.4-1.5 7.5-5.1 7.5-9.5V6Z" />
      <circle cx="9" cy="12" r="0.9" fill="currentColor" />
      <circle cx="12" cy="12" r="0.9" fill="currentColor" />
      <circle cx="15" cy="12" r="0.9" fill="currentColor" />
    </Base>
  );
}

/** Reloj de arena: el tiempo para crear el PIN se agotó. */
export function IconoTiempo(props: Props) {
  return (
    <Base {...props}>
      <path d="M6.5 3.5h11M6.5 20.5h11" />
      <path d="M7.5 3.5c0 4 4.5 5.2 4.5 8.5S7.5 16.5 7.5 20.5M16.5 3.5c0 4-4.5 5.2-4.5 8.5s4.5 4.5 4.5 8.5" />
      <path d="M10 18.5h4" opacity={0.55} />
    </Base>
  );
}
