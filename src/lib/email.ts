import "server-only";
import nodemailer, { type Transporter } from "nodemailer";

/**
 * Correo de recuperación de contraseña, enviado por SMTP con Nodemailer (por defecto, Gmail).
 */

interface Correo {
  para: string;
  asunto: string;
  html: string;
  texto: string;
}

const empresa = () => process.env.EMPRESA_NOMBRE ?? "JMC";

/** Escapa texto para insertarlo en HTML (el nombre viene de la base de datos, no se confía en él). */
function escapar(valor: string): string {
  return valor.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

const primerNombre = (nombre: string) => nombre.trim().split(/\s+/)[0] || "";

// ─── Plantilla ────────────────────────────────────────────────────────

/**
 * Correo responsive y accesible: tablas de maquetación con role="presentation" (compatibilidad con
 * Outlook/Gmail), ancho fluido hasta 560px y contraste AA (#1e293b sobre blanco, blanco sobre #1e40af).
 */
export function plantillaRestablecer(datos: { nombre: string; url: string; vigenciaMinutos: number }): Omit<Correo, "para"> {
  const nombre = escapar(primerNombre(datos.nombre));
  const nombreEmpresa = escapar(empresa());
  const url = escapar(datos.url);
  const vigencia =
    datos.vigenciaMinutos >= 60 ? `${Math.round(datos.vigenciaMinutos / 60)} hora(s)` : `${datos.vigenciaMinutos} minutos`;
  const saludo = `Hola${nombre ? ` ${nombre}` : ""},`;

  const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light only">
<title>Restablece tu contraseña</title>
<style>@media (max-width: 600px) { .contenedor { width: 100% !important; } .relleno { padding: 24px 20px !important; } }</style>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;color:#1e293b;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">El enlace vence en ${vigencia}.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;">
  <tr><td align="center" style="padding:32px 12px;">
    <table role="presentation" class="contenedor" width="560" cellpadding="0" cellspacing="0" style="width:560px;max-width:560px;background:#ffffff;border-radius:12px;border:1px solid #e2e8f0;">
      <tr><td style="padding:24px 32px;border-bottom:1px solid #e2e8f0;">
        <span style="display:inline-block;background:#1e40af;color:#ffffff;font-weight:bold;font-size:14px;padding:8px 10px;border-radius:8px;">${nombreEmpresa}</span>
        <span style="font-size:14px;color:#475569;margin-left:8px;">Portal de nómina</span>
      </td></tr>
      <tr><td class="relleno" style="padding:32px;font-size:15px;line-height:1.6;">
        <h1 style="margin:0 0 16px;font-size:20px;line-height:1.3;color:#0f172a;">Restablece tu contraseña</h1>
        <p style="margin:0 0 16px;">${saludo}</p>
        <p style="margin:0 0 16px;">Recibimos una solicitud para restablecer la contraseña de tu cuenta. Haz clic en el botón para crear una nueva:</p>
        <table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;"><tr><td style="border-radius:8px;background:#1e40af;">
          <a href="${url}" target="_blank" rel="noopener" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:bold;color:#ffffff;text-decoration:none;border-radius:8px;">Crear nueva contraseña</a>
        </td></tr></table>
        <p style="margin:0 0 16px;"><strong>El enlace vence en ${vigencia}</strong> y solo se puede usar una vez.</p>
        <p style="margin:0 0 16px;font-size:13px;color:#475569;">Si el botón no funciona, copia y pega este enlace en tu navegador:<br>
          <a href="${url}" style="color:#1e40af;word-break:break-all;">${url}</a></p>
        <p style="margin:0;padding:12px 16px;background:#f8fafc;border-left:4px solid #94a3b8;font-size:14px;">
          Si no solicitaste esto, ignora este email. Tu contraseña actual seguirá funcionando.
        </p>
      </td></tr>
      <tr><td style="padding:20px 32px;border-top:1px solid #e2e8f0;font-size:13px;line-height:1.5;color:#475569;">
        ¿Necesitas ayuda? Comunícate con el área de Talento Humano.<br>
        Este es un mensaje automático de ${nombreEmpresa}; no respondas a este correo.
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;

  const texto = `Hola${primerNombre(datos.nombre) ? ` ${primerNombre(datos.nombre)}` : ""},

Recibimos una solicitud para restablecer la contraseña de tu cuenta en ${empresa()}.
Abre este enlace para crear una nueva (vence en ${vigencia} y solo se puede usar una vez):

${datos.url}

Si no solicitaste esto, ignora este email.
¿Necesitas ayuda? Comunícate con el área de Talento Humano.`;

  return { asunto: `${empresa()}: restablece tu contraseña`, html, texto };
}

// ─── Envío ────────────────────────────────────────────────────────────

let transporte: Transporter | null = null;

function obtenerTransporte(): Transporter | null {
  const usuario = process.env.SMTP_USER;
  const password = process.env.SMTP_PASSWORD;
  if (!usuario || !password) return null;
  transporte ??= nodemailer.createTransport({
    host: process.env.SMTP_HOST ?? "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT ?? 465),
    secure: Number(process.env.SMTP_PORT ?? 465) === 465, // 465 = TLS directo; 587 = STARTTLS
    auth: { user: usuario, pass: password },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
  });
  return transporte;
}

/**
 * Envía el correo. Devuelve true si el servidor SMTP lo aceptó.
 * Sin SMTP_USER/SMTP_PASSWORD en desarrollo, lo imprime en la consola del servidor para poder probar
 * el flujo localmente (en producción nunca se imprime: contiene un enlace de un solo uso).
 */
export async function enviarCorreo(correo: Correo): Promise<boolean> {
  const smtp = obtenerTransporte();
  if (!smtp) {
    if (process.env.NODE_ENV !== "production") {
      console.info(`\n[email:desarrollo] Para: ${correo.para}\nAsunto: ${correo.asunto}\n\n${correo.texto}\n`);
      return true;
    }
    console.error("[email] SMTP_USER y SMTP_PASSWORD no están configurados: no se envió el correo");
    return false;
  }

  try {
    await smtp.sendMail({
      from: { name: process.env.EMAIL_REMITENTE_NOMBRE ?? `Nómina ${empresa()}`, address: process.env.SMTP_USER! },
      to: correo.para,
      subject: correo.asunto,
      html: correo.html,
      text: correo.texto,
    });
    return true;
  } catch (error) {
    // No se registra el contenido: incluye el enlace con el token
    console.error("[email] El servidor SMTP rechazó el envío:", (error as Error).message);
    return false;
  }
}
