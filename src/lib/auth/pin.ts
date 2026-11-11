/**
 * Reglas del PIN numérico de los colaboradores.
 * Módulo compartido cliente/servidor: NO importa nada exclusivo del servidor.
 *
 * Por qué un PIN corto es aceptable aquí: el ingreso es en línea y cada cuenta se bloquea a los
 * 5 intentos fallidos (30 min) y a los 10 acumulados (hasta que el admin genere un PIN temporal).
 * Con 10.000 combinaciones menos las triviales, adivinar a ciegas es muy improbable.
 */

/** Dígitos del PIN que crea el colaborador. */
export const LONGITUD_PIN = 4;
/** Dígitos del PIN temporal que genera el administrador (distinto largo: no se confunden). */
export const LONGITUD_PIN_TEMPORAL = 6;

/** Longitud máxima del secreto en el login: el admin usa una contraseña, no un PIN. */
export const LONGITUD_MAXIMA_SECRETO = 128;

const esSecuencia = (pin: string, paso: 1 | -1) =>
  [...pin].every((d, i) => i === 0 || Number(d) === (Number(pin[i - 1]) + paso + 10) % 10);

/** PIN muy usados que no siguen un patrón simple (columna del teclado, fechas típicas…). */
const PINES_COMUNES = new Set(["2580", "0852", "1004", "2000", "6969", "1122", "1337", "7777", "0007", "1010"]);

/** Devuelve los motivos por los que el PIN no se acepta (vacío = válido). */
export function erroresPin(pin: string, cedula = ""): string[] {
  if (!new RegExp(`^\\d{${LONGITUD_PIN}}$`).test(pin)) {
    return [`El PIN debe tener exactamente ${LONGITUD_PIN} números`];
  }
  const errores: string[] = [];
  if (/^(\d)\1+$/.test(pin)) errores.push("No uses el mismo número repetido (como 1111)");
  else if (esSecuencia(pin, 1) || esSecuencia(pin, -1)) errores.push("No uses números seguidos (como 1234 o 4321)");
  else if (/^(\d\d)\1$/.test(pin)) errores.push("No repitas el mismo par de números (como 1212)");
  else if (/^(19[3-9]\d|20[0-3]\d)$/.test(pin)) errores.push("No uses un año (como el de tu nacimiento)");
  else if (PINES_COMUNES.has(pin)) errores.push("Ese PIN es muy común. Elige otro");
  if (cedula && cedula.includes(pin)) errores.push("No uses números de tu cédula");
  return errores;
}
