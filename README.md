# Aplicativo JMC — Gestión de nómina

Sistema web para gestionar colaboradores, desprendibles de nómina y certificados laborales.

- **Admin:** CRUD de colaboradores, desprendibles (individual y cargue masivo desde Excel/CSV), certificados.
- **Colaborador:** consulta y descarga en PDF de sus propios desprendibles y certificados.
- **Acceso:** número de cédula + código de verificación de 6 dígitos. La sesión es un JWT en una cookie httpOnly que dura 8 horas.

## Stack

Next.js 16 (App Router) · React 19 · TypeScript strict · Tailwind CSS v4 · Airtable · jose (JWT) · @react-pdf/renderer · zod · TanStack Query v5 · xlsx · lucide-react

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

### Código de verificación

- Si `RESEND_API_KEY` está configurada, el código se envía al `email` del colaborador.
- En desarrollo sin proveedor de correo, el código se muestra en la pantalla de login.
- En producción **debe** configurar `RESEND_API_KEY` y `EMAIL_REMITENTE`, con un dominio verificado en Resend.
- El código vence en 10 minutos y se invalida tras 5 intentos fallidos. Se guarda como hash SHA-256, nunca en texto plano.

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
| codigo_verificacion | Single line text |
| codigo_expira | Date con hora (GMT) |

> Cree manualmente al primer administrador en Airtable (`rol = admin`, `estado = Activo`).

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
3. El workflow `.github/workflows/ci.yml` ejecuta lint y verificación de tipos en cada push y PR.

## Notas técnicas

- En Next.js 16, `middleware.ts` pasó a llamarse **`proxy.ts`**. La protección de rutas está en [src/proxy.ts](src/proxy.ts).
- Cada API route vuelve a verificar la sesión y el rol. El proxy no es la única barrera.
- Las plantillas PDF están en `src/lib/pdf/*.tsx`: usan JSX, por eso la extensión es `.tsx` y no `.ts`.
- `xlsx@0.18.5` (versión de npm) tiene vulnerabilidades conocidas sin parche. Solo se usa en el navegador del administrador para leer archivos que él mismo sube. Para mayor seguridad puede instalar la versión oficial de SheetJS: `npm i https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz`.
