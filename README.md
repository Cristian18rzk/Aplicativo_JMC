# Aplicativo JMC — Gestión de nómina

Sistema web para gestionar colaboradores, desprendibles de nómina y certificados laborales.

- **Admin:** CRUD de colaboradores, desprendibles (individual y cargue masivo desde Excel/CSV), certificados.
- **Colaborador:** consulta y descarga en PDF de sus propios desprendibles y certificados.
- **Acceso:** correo + contraseña (Auth.js v5). Access token de 15 minutos y refresh token rotativo de 7 días, ambos en cookies HttpOnly. Ver [Autenticación](#autenticación).

## Stack

Next.js 16 (App Router) · React 19 · TypeScript strict · Tailwind CSS v4 · Airtable · Auth.js (NextAuth v5) · bcryptjs · @react-pdf/renderer · zod · React Hook Form · Framer Motion · TanStack Query v5 · xlsx · lucide-react

## Puesta en marcha

```bash
npm install
cp .env.example .env.local   # complete las variables
npm run dev                  # http://localhost:3000
```

| Script               | Descripción                                |
| -------------------- | ------------------------------------------ |
| `npm run dev`        | Servidor de desarrollo                     |
| `npm run build`      | Build de producción                        |
| `npm run lint`       | ESLint                                     |
| `npm run type-check` | Genera los tipos de rutas y ejecuta `tsc`  |
| `npm run auth:setup` | Crea las tablas de autenticación en Airtable |
| `npm run auth:seed`  | Crea el administrador inicial              |
| `npm run auth:migrar` | Crea cuentas para colaboradores existentes |

## Autenticación

### Primer arranque

1. `npm run auth:setup` crea las tablas `Usuarios`, `refresh_tokens` y `auth_logs`. Es idempotente y el token de Airtable necesita además `schema.bases:read` y `schema.bases:write`.
2. `npm run auth:seed -- --email=admin@empresa.com --nombre="Nombre Apellido"` crea el administrador. La contraseña se pide oculta en la terminal.
3. Solo si ya había colaboradores: `npm run auth:migrar` muestra las cuentas que se van a crear y `npm run auth:migrar -- --aplicar` las crea. Quedan sin contraseña y cada persona la crea en `/auth/forgot-password`.

Cuando un admin crea un colaborador con correo, se le crea la cuenta sin contraseña. El colaborador la crea en `/auth/forgot-password` con su correo registrado. Si se cambia el correo, el rol o el estado de la ficha, el cambio se refleja en la cuenta y se cierran sus sesiones.

### Cómo funciona

| Tema | Comportamiento |
| --- | --- |
| Contraseñas | bcrypt con 12 rondas. Política: entre 8 y 128 caracteres, con mayúscula, minúscula, número y símbolo. No puede estar entre las 10.000 más comunes ni contener el correo o el nombre. No se pueden reutilizar las últimas 3. |
| Fuerza bruta | 5 fallos en 15 min bloquean la cuenta 30 min. 10 fallos acumulados la bloquean hasta que un admin la desbloquee. Máximo 20 intentos por IP cada 15 min. Retardo progresivo de 1, 2, 4, 8 y 16 s. El mensaje siempre es "Credenciales inválidas". |
| Sesión | El access token (JWT cifrado de Auth.js) dura 15 min y guarda solo userId, role, cid, iat y exp. El refresh token dura 7 días y se rota en cada uso dentro de [src/proxy.ts](src/proxy.ts). En Airtable solo se guarda su hash SHA-256. Si se reutiliza un refresh token ya rotado, se revoca toda su familia. |
| Cookies | `__Host-` en producción, con HttpOnly, Secure, SameSite=Strict y Path=/. |
| Restablecer | El token sale de `crypto.randomBytes(32)` y se guarda hasheado con SHA-256. Vence en 1 hora y sirve una sola vez. Se permiten 3 solicitudes por correo cada hora. La respuesta es la misma exista o no el correo, y se envía antes de consultar la base. |
| CSRF | Auth.js protege el login. Los endpoints propios exigen la cabecera `X-CSRF-Token` firmada y un `Origin` válido. |
| Auditoría | La tabla `auth_logs` registra logins, bloqueos, solicitudes de reset y cambios de contraseña. Nunca guarda contraseñas ni tokens. |

**Desbloquear una cuenta (bloqueo permanente):** en `Usuarios`, desmarque `locked_permanently` y ponga `total_failed_attempts` en 0.

**Correo:** el único correo que envía la app es el de recuperación de contraseña. Sale por Gmail SMTP con Nodemailer. En producción `SMTP_USER` y `SMTP_PASSWORD` son obligatorias. `SMTP_PASSWORD` es una contraseña de aplicación de Google (requiere verificación en 2 pasos). En desarrollo, sin estas variables, el correo se imprime en la consola del servidor.

**Rate limiting:** los límites por IP y por correo viven en la memoria del servidor. En Vercel cada instancia lleva su propio contador, así que son aproximados. El bloqueo de cuentas por intentos fallidos se guarda en Airtable y siempre se aplica.

## Base de Airtable

Cree una base con las tres tablas siguientes. Los nombres de las tablas y de los campos deben coincidir **exactamente**.

### Colaboradores (campo primario: `cedula`)

| Campo | Tipo |
| --- | --- |
| cedula | Single line text (primario) |
| nombres, apellidos, cargo | Single line text |
| area | Single select: Administrativa, Operativa, Campo |
| fecha_ingreso | Date (ISO) |
| tipo_contrato | Single select: Fijo, Indefinido, Obra o labor |
| salario_base | Currency (COP, 0 decimales) |
| eps, fondo_pensiones, arl, caja_compensacion, cuenta_bancaria | Single line text |
| banco | Single select |
| estado | Single select: Activo, Inactivo, Retirado |
| rol | Single select: admin, colaborador |
| email | Email |
| telefono | Phone |

> Los campos `codigo_verificacion` y `codigo_expira` del login anterior ya no se usan y se pueden eliminar.
> Las tablas `Usuarios`, `refresh_tokens` y `auth_logs` las crea `npm run auth:setup` (ver [scripts/setup-airtable.mjs](scripts/setup-airtable.mjs)). **Restrinja el acceso a `Usuarios` en Airtable: contiene los hashes.**

### Desprendibles

| Campo | Tipo |
| --- | --- |
| colaborador | Link to Colaboradores (un solo registro) |
| periodo | Single line text (`YYYY-MM`) |
| tipo_periodo | Single select: Quincenal 1, Quincenal 2, Mensual |
| salario_base, auxilio_transporte, otros_devengados, deduccion_salud, deduccion_pension, retencion_fuente, otros_descuentos | Currency |
| dias_trabajados, horas_extras_diurnas, horas_extras_nocturnas, recargos_nocturnos, dominicales_festivos | Number (horas o días, admite decimales) |
| descripcion_otros, descripcion_descuentos | Long text |
| total_devengado, total_deducciones, neto_a_pagar | Formula (ver abajo) |
| fecha_generacion | Date |

**La aplicación calcula los totales** con los parámetros de [src/lib/nomina.ts](src/lib/nomina.ts) y los usa en pantalla y en los PDF. Las fórmulas siguientes producen los mismos valores dentro de Airtable:

```
total_devengado =
ROUND({salario_base}/30*{dias_trabajados},0)
+ ROUND({horas_extras_diurnas}*{salario_base}/210*1.25,0)
+ ROUND({horas_extras_nocturnas}*{salario_base}/210*1.75,0)
+ ROUND({recargos_nocturnos}*{salario_base}/210*0.35,0)
+ ROUND({dominicales_festivos}*{salario_base}/210*0.9,0)
+ {auxilio_transporte} + {otros_devengados}

total_deducciones = {deduccion_salud} + {deduccion_pension} + {retencion_fuente} + {otros_descuentos}

neto_a_pagar = {total_devengado} - {total_deducciones}
```

Parámetros actuales: jornada de 42 h/semana, es decir 210 h/mes (Ley 2101 de 2021). Recargo dominical del 90% (Ley 2466 de 2025). Aportes del trabajador: 4% salud y 4% pensión. Si cambia la normativa, actualice `PARAMETROS_NOMINA` y las fórmulas.

### Certificados

| Campo | Tipo |
| --- | --- |
| colaborador | Link to Colaboradores |
| tipo | Single select: Laboral, Ingresos y retenciones |
| fecha_generacion | Date |
| contenido_json | Long text |
| generado_por | Single line text |

## Cargue masivo

En `/admin/desprendibles/cargar` puede subir un archivo .xlsx, .xls o .csv (máximo 5 MB y 1.000 filas). El proceso tiene tres pasos:

1. Subir el archivo.
2. Mapear las columnas. Hay detección automática y valores por defecto para el periodo y el tipo.
3. Revisar la vista previa con validación y confirmar.

En esa misma pantalla se puede descargar una plantilla de ejemplo. Durante el cargue:

- Las filas que no traen salario usan el salario del colaborador.
- Salud y pensión se calculan al 4% si la fila no los trae.
- Se rechazan los duplicados (mismo colaborador, periodo y tipo) y las cédulas que no existen.

## Despliegue en Vercel

1. Suba el repositorio a GitHub e impórtelo en Vercel. La región `gru1` (São Paulo) ya está fijada en `vercel.json`.
2. Configure en Vercel las variables de `.env.example`.
3. Antes de subir cambios, ejecute `npm run lint` y `npm run type-check`. El build de Vercel también falla si hay errores de tipos.

## Notas técnicas

- En Next.js 16, `middleware.ts` pasó a llamarse **`proxy.ts`**. La protección de rutas está en [src/proxy.ts](src/proxy.ts).
- Cada API route vuelve a verificar la sesión y el rol. El proxy no es la única barrera.
- La Content-Security-Policy se genera en el proxy con un nonce por petición. Por eso todas las páginas se renderizan de forma dinámica (`connection()` en el layout raíz). El resto de encabezados de seguridad está en [next.config.ts](next.config.ts).
- Las plantillas PDF están en `src/lib/pdf/*.tsx`: usan JSX, por eso la extensión es `.tsx` y no `.ts`.
- `xlsx@0.18.5` (versión de npm) tiene vulnerabilidades conocidas sin parche. Solo se usa en el navegador del administrador para leer archivos que él mismo sube. Para mayor seguridad puede instalar la versión oficial de SheetJS: `npm i https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz`.
