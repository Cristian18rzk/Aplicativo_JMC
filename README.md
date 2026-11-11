# Aplicativo JMC — Documentos de colaboradores

Sistema web para gestionar a los colaboradores y sus documentos: desprendibles de pago y certificados laborales. El aplicativo no calcula nómina: los desprendibles son los PDF que genera el software de nómina de la empresa.

- **Admin:** CRUD de colaboradores; carga de desprendibles en PDF (uno a uno o masivo); generación de certificados laborales.
- **Colaborador:** consulta y descarga de sus propios desprendibles y certificados.
- **Acceso:** cédula + PIN de 4 números para los colaboradores; cédula + contraseña para el admin (Auth.js v5). Sin correo: el admin entrega un PIN temporal en persona. Access token de 15 minutos y refresh token rotativo de 7 días, ambos en cookies HttpOnly. Ver [Autenticación](#autenticación).

## Stack

Next.js 16 (App Router) · React 19 · TypeScript strict · Tailwind CSS v4 · Airtable · Auth.js (NextAuth v5) · bcryptjs · @react-pdf/renderer · zod · React Hook Form · Framer Motion · Nodemailer · TanStack Query v5 · lucide-react

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
| `npm run auth:setup` | Crea las tablas de autenticación y completa `Desprendibles` en Airtable |
| `npm run auth:seed`  | Crea el administrador inicial              |
| `npm run auth:migrar` | Crea cuentas para colaboradores existentes |

## Autenticación

### Primer arranque

1. `npm run auth:setup` crea las tablas `Usuarios`, `refresh_tokens` y `auth_logs`, o les agrega los campos que falten (`cedula`, `must_change_pin`, `temp_pin_expires`…). Es idempotente y el token de Airtable necesita además `schema.bases:read` y `schema.bases:write`.
2. `npm run auth:seed -- --cedula=1098765432 --nombre="Nombre Apellido"` crea el administrador. La contraseña se pide oculta en la terminal. Si el admin ya existía con el ingreso por correo, agregue `--email=<su correo> --forzar` para asignarle la cédula.
3. Solo si ya había colaboradores: `npm run auth:migrar` muestra los cambios y `npm run auth:migrar -- --aplicar` los guarda. Crea las cuentas que falten y completa la cédula en las antiguas. Las cuentas nuevas quedan sin PIN.

### Ingreso con PIN

| Paso | Quién | Qué pasa |
| --- | --- | --- |
| 1 | Admin | Crea al colaborador. Se crea su cuenta de acceso, todavía sin PIN. |
| 2 | Admin | En la ficha, tarjeta **Acceso al aplicativo**, pulsa **Generar PIN temporal**. Aparece un PIN de 6 números, una sola vez, que vence en 7 días. Se lo entrega en persona. |
| 3 | Colaborador | Ingresa con su cédula y el PIN temporal. El aplicativo lo lleva a `/auth/crear-pin`, donde elige su PIN de 4 números, y entra directamente. |
| ¿Olvidó el PIN o quedó bloqueado? | Admin | **Restablecer PIN** en la ficha: se repite desde el paso 2. El PIN anterior deja de servir, se cierran sus sesiones y se levanta cualquier bloqueo. |

El PIN no puede ser un número repetido (1111), seguido (1234, 4321), un par repetido (1212), un año (1930–2039), uno de los PIN más comunes ni una parte de la cédula. Las reglas están en [src/lib/auth/pin.ts](src/lib/auth/pin.ts).

El admin no usa PIN: en el login pulsa **Soy administrador** y escribe su contraseña. Su contraseña solo se asigna o cambia con `npm run auth:seed`. Desde el panel no se puede generar un PIN para una ficha con rol admin.

Si se cambia la cédula, el rol o el estado de una ficha, el cambio se refleja en la cuenta y se cierran sus sesiones. El correo de la ficha es opcional y ya no se usa para ingresar.

### Cómo funciona

| Tema | Comportamiento |
| --- | --- |
| PIN y contraseñas | El PIN, el PIN temporal y la contraseña del admin se guardan con bcrypt de 12 rondas, nunca en texto plano. El PIN temporal sale de `crypto.randomInt`. La contraseña del admin la valida `auth:seed`: entre 8 y 128 caracteres, con mayúscula, minúscula, número y símbolo; no puede estar entre las 10.000 más comunes ni contener el correo, el nombre o la cédula. |
| PIN temporal | Mientras está pendiente, la cuenta no puede tener sesión. Acertarlo no abre sesión: emite un token de un solo uso (`crypto.randomBytes(32)`, guardado como SHA-256) en una cookie HttpOnly de 15 minutos, y solo con ese token se crea el PIN. |
| Fuerza bruta | 5 fallos en 15 min bloquean la cuenta 30 min. 10 fallos acumulados la bloquean hasta que el admin genere un PIN temporal. Máximo 20 intentos por IP cada 15 min. Retardo progresivo de 1, 2, 4, 8 y 16 s. El mensaje siempre es "Cédula o PIN incorrectos", exista o no la cédula. |
| Sesión | El access token (JWT cifrado de Auth.js) dura 15 min y guarda solo userId, role, cid, iat y exp. El refresh token dura 7 días y se rota en cada uso dentro de [src/proxy.ts](src/proxy.ts). En Airtable solo se guarda su hash SHA-256. Si se reutiliza un refresh token ya rotado, se revoca toda su familia. |
| Cookies | `__Host-` en producción, con HttpOnly, Secure, SameSite=Strict y Path=/. |
| CSRF | Auth.js protege el login. Los endpoints propios (crear PIN, generar PIN temporal, logout) exigen la cabecera `X-CSRF-Token` firmada y un `Origin` válido. |
| Auditoría | La tabla `auth_logs` registra logins, bloqueos, PIN temporales generados (y por qué admin) y PIN creados. Nunca guarda PIN, contraseñas ni tokens. |

**Desbloquear una cuenta:** desde la ficha del colaborador, **Restablecer PIN**. Para un admin: `npm run auth:seed -- --cedula=... --forzar`.

**Correo:** la app ya no envía correos. [src/lib/email.ts](src/lib/email.ts) y la dependencia `nodemailer` quedaron sin uso, y las variables `SMTP_*` ya no hacen falta.

**Rate limiting:** los límites por IP y por cédula viven en la memoria del servidor. En Vercel cada instancia lleva su propio contador, así que son aproximados. El bloqueo de cuentas por intentos fallidos se guarda en Airtable y siempre se aplica.

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
| salario_base | Currency (COP, 0 decimales). Solo se usa en el certificado laboral |
| estado | Single select: Activo, Inactivo, Retirado |
| rol | Single select: admin, colaborador |
| email | Email |
| telefono | Phone |

> Ya no se usan y se pueden eliminar de Airtable: `codigo_verificacion` y `codigo_expira` (login anterior) y `eps`, `fondo_pensiones`, `arl`, `caja_compensacion`, `cuenta_bancaria` y `banco` (nómina).
> Las tablas `Usuarios`, `refresh_tokens` y `auth_logs` las crea `npm run auth:setup` (ver [scripts/setup-airtable.mjs](scripts/setup-airtable.mjs)). **Restrinja el acceso a `Usuarios` en Airtable: contiene los hashes.**

### Desprendibles

Cada registro es el PDF de un desprendible, por colaborador y periodo.

| Campo | Tipo |
| --- | --- |
| colaborador | Link to Colaboradores (un solo registro) |
| periodo | Single line text (`YYYY-MM`) |
| tipo_periodo | Single select: Quincenal 1, Quincenal 2, Mensual |
| archivo | Attachment: el PDF (máximo 4 MB) |
| nombre_archivo | Single line text |
| tamano_bytes | Number |
| cargado_por | Single line text |
| fecha_generacion | Date (fecha de carga) |

`archivo`, `nombre_archivo`, `tamano_bytes` y `cargado_por` los agrega `npm run auth:setup`. Los campos de valores de nómina que tenía esta tabla (salario, horas extras, deducciones, totales…) ya no se usan y se pueden eliminar.

El PDF se sube a Airtable desde el servidor y se descarga siempre a través de la API (`/api/desprendibles/[id]/pdf`), que verifica que quien lo pide sea admin o el dueño. El navegador nunca recibe la URL del adjunto en Airtable.

### Certificados

| Campo | Tipo |
| --- | --- |
| colaborador | Link to Colaboradores |
| tipo | Single select: Laboral |
| fecha_generacion | Date |
| contenido_json | Long text |
| generado_por | Single line text |

## Cargue masivo

En `/admin/desprendibles/cargar` se suben varios PDF de un mismo periodo:

1. Elija el periodo y el tipo (Quincenal 1, Quincenal 2 o Mensual).
2. Arrastre los PDF. Cada archivo se asigna al colaborador cuya cédula aparece en el nombre, por ejemplo `1098765432.pdf` o `desprendible_1098765432_octubre.pdf`. Los que no se reconozcan se asignan a mano.
3. Pulse **Subir**. Los archivos se suben uno por uno y cada uno muestra su resultado. Se rechazan los duplicados (mismo colaborador, periodo y tipo) y los archivos que no son PDF.

Desde la ficha de un colaborador también se puede subir un desprendible para él directamente.

## Despliegue en Vercel

1. Suba el repositorio a GitHub e impórtelo en Vercel. La región `gru1` (São Paulo) ya está fijada en `vercel.json`.
2. Configure en Vercel las variables de `.env.example`.
3. Antes de subir cambios, ejecute `npm run lint` y `npm run type-check`. El build de Vercel también falla si hay errores de tipos.

## Notas técnicas

- En Next.js 16, `middleware.ts` pasó a llamarse **`proxy.ts`**. La protección de rutas está en [src/proxy.ts](src/proxy.ts).
- Cada API route vuelve a verificar la sesión y el rol. El proxy no es la única barrera.
- La Content-Security-Policy se genera en el proxy con un nonce por petición. Por eso todas las páginas se renderizan de forma dinámica (`connection()` en el layout raíz). El resto de encabezados de seguridad está en [next.config.ts](next.config.ts).
- Las plantillas PDF están en `src/lib/pdf/*.tsx`: usan JSX, por eso la extensión es `.tsx` y no `.ts`.
- Límite de 4 MB por PDF: Vercel acepta hasta 4,5 MB por petición y Airtable hasta 5 MB por adjunto.
