import { beforeEach, describe, expect, it, vi } from "vitest";
import { IDS, crearUsuario, idAirtable } from "@test/fabricas";
import type { RefreshTokenRegistro } from "@/lib/airtable/refresh-tokens";

vi.mock("@/lib/airtable/refresh-tokens", () => ({
  crearRefreshToken: vi.fn(),
  getRefreshToken: vi.fn(),
  revocarFamilia: vi.fn(),
  revocarRefreshToken: vi.fn(),
  revocarTodosDelUsuario: vi.fn(),
}));
vi.mock("@/lib/airtable/rest", async (original) => ({
  ...(await original<typeof import("@/lib/airtable/rest")>()),
  obtener: vi.fn(),
}));
vi.mock("@/lib/airtable/usuarios", () => ({ getUsuarioPorId: vi.fn() }));
vi.mock("@/lib/airtable/auth-logs", () => ({ registrarEventoAuth: vi.fn() }));

const refreshDb = await import("@/lib/airtable/refresh-tokens");
const { obtener } = await import("@/lib/airtable/rest");
const { getUsuarioPorId } = await import("@/lib/airtable/usuarios");
const { generarTokenSeguro, sha256 } = await import("./tokens");
const { GRACIA_ROTACION_MS } = await import("./constantes");
const sesiones = await import("./sesiones");

/** La ficha del colaborador en Airtable (la consulta fichaActiva). */
const fichaEnAirtable = (estado: string) =>
  vi.mocked(obtener).mockResolvedValue({ id: IDS.colaborador, createdTime: "", fields: { estado } });

describe("tokenAccesoValido", () => {
  const vigente = { sub: IDS.usuario, role: "colaborador" as const, cid: IDS.colaborador, accessExpires: Date.now() + 60_000, authTime: 1 };

  it("acepta un token con forma correcta y vigente", () => {
    expect(sesiones.tokenAccesoValido(vigente)).toMatchObject({ sub: IDS.usuario, role: "colaborador" });
  });

  it.each([
    ["nulo", null],
    ["sin sub", { ...vigente, sub: undefined }],
    ["con un rol inventado", { ...vigente, role: "superadmin" }],
    ["vencido", { ...vigente, accessExpires: Date.now() - 1 }],
    ["sin vencimiento", { ...vigente, accessExpires: undefined }],
  ])("rechaza un token %s", (_, token) => {
    expect(sesiones.tokenAccesoValido(token as never)).toBeNull();
  });
});

describe("access token cifrado", () => {
  it("lo que se cifra se puede leer", async () => {
    const datos = sesiones.crearDatosAcceso({ id: IDS.usuario, role: "admin", colaboradorId: "" }, 123);
    const cifrado = await sesiones.cifrarAccessToken(datos);

    expect(cifrado).not.toContain(IDS.usuario);
    expect(await sesiones.leerAccessToken(cifrado)).toEqual(datos);
  });

  it("un valor alterado o vacío no es una sesión", async () => {
    expect(await sesiones.leerAccessToken("no-es-un-jwt")).toBeNull();
    expect(await sesiones.leerAccessToken(undefined)).toBeNull();
  });
});

describe("cuentaHabilitada", () => {
  beforeEach(() => fichaEnAirtable("Activo"));

  it("acepta una cuenta activa con PIN y ficha activa", async () => {
    expect(await sesiones.cuentaHabilitada(crearUsuario(), 0)).toBe(true);
  });

  it.each([
    ["inexistente", null],
    ["desactivada", crearUsuario({ activo: false })],
    ["bloqueada temporalmente", crearUsuario({ lockedUntil: Date.now() + 60_000 })],
    ["bloqueada permanentemente", crearUsuario({ lockedPermanently: true })],
    ["sin PIN", crearUsuario({ passwordHash: "" })],
    ["con PIN temporal pendiente", crearUsuario({ debeCambiarPin: true })],
    ["cuyo PIN cambió después del login", crearUsuario({ lastPasswordChange: 2000 })],
  ])("rechaza una cuenta %s", async (_, usuario) => {
    expect(await sesiones.cuentaHabilitada(usuario, 1000)).toBe(false);
  });

  it("rechaza a un colaborador cuya ficha no está activa", async () => {
    fichaEnAirtable("Retirado");
    expect(await sesiones.cuentaHabilitada(crearUsuario(), 0)).toBe(false);
  });

  it("rechaza a un colaborador sin ficha asociada", async () => {
    expect(await sesiones.cuentaHabilitada(crearUsuario({ colaboradorId: "" }), 0)).toBe(false);
  });

  it("un admin no depende de una ficha de colaborador", async () => {
    vi.mocked(obtener).mockClear();
    expect(await sesiones.cuentaHabilitada(crearUsuario({ role: "admin", colaboradorId: "" }), 0)).toBe(true);
    expect(obtener).not.toHaveBeenCalled();
  });
});

describe("rotarSesion (refresh token)", () => {
  const ID_TOKEN = IDS.refreshToken;
  const secreto = generarTokenSeguro();
  const cookie = `${ID_TOKEN}.${secreto}`;

  const registro = (cambios: Partial<RefreshTokenRegistro> = {}): RefreshTokenRegistro => ({
    id: ID_TOKEN,
    tokenHash: sha256(secreto),
    usuarioId: IDS.usuario,
    familia: "familia-1",
    expiraEn: Date.now() + 60_000,
    revocadoEn: 0,
    motivoRevocacion: "",
    authTime: 1000,
    creadoEn: 0,
    ...cambios,
  });

  beforeEach(() => {
    fichaEnAirtable("Activo");
    vi.mocked(getUsuarioPorId).mockResolvedValue(crearUsuario());
    vi.mocked(refreshDb.crearRefreshToken).mockResolvedValue(registro({ id: idAirtable("REFRESH2") }));
  });

  it("emite un access token y un refresh token nuevos, y revoca el usado", async () => {
    vi.mocked(refreshDb.getRefreshToken).mockResolvedValue(registro());

    const resultado = await sesiones.rotarSesion(cookie, "10.0.0.1", "vitest");

    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;
    const [id, secretoNuevo, ...resto] = (resultado.refreshCookie ?? "").split(".");
    expect({ id, resto }).toEqual({ id: idAirtable("REFRESH2"), resto: [] });
    expect(secretoNuevo).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(resultado.datos).toMatchObject({ sub: IDS.usuario, authTime: 1000 });
    expect(refreshDb.crearRefreshToken).toHaveBeenCalledWith(expect.objectContaining({ familia: "familia-1" }));
    expect(refreshDb.revocarRefreshToken).toHaveBeenCalledWith(ID_TOKEN, "rotado");
  });

  it.each(["", "basura", `${ID_TOKEN}`, `recCORTO.${secreto}`, `${ID_TOKEN}.${secreto}.extra`])(
    "rechaza la cookie mal formada %j sin consultar Airtable",
    async (valor) => {
      expect(await sesiones.rotarSesion(valor, "", "")).toEqual({ ok: false, motivo: "invalido" });
      expect(refreshDb.getRefreshToken).not.toHaveBeenCalled();
    },
  );

  it("rechaza un secreto que no coincide con el hash guardado", async () => {
    vi.mocked(refreshDb.getRefreshToken).mockResolvedValue(registro({ tokenHash: sha256("otro") }));
    expect(await sesiones.rotarSesion(cookie, "", "")).toEqual({ ok: false, motivo: "invalido" });
  });

  it("si reaparece un token ya rotado (posible robo de cookie) revoca toda la familia", async () => {
    vi.mocked(refreshDb.getRefreshToken).mockResolvedValue(
      registro({ revocadoEn: Date.now() - GRACIA_ROTACION_MS - 1000, motivoRevocacion: "rotado" }),
    );

    expect(await sesiones.rotarSesion(cookie, "", "")).toEqual({ ok: false, motivo: "reutilizado" });
    expect(refreshDb.revocarFamilia).toHaveBeenCalledWith("familia-1", "reutilizado");
  });

  it("dentro de la ventana de gracia (peticiones paralelas) da acceso sin rotar otra vez", async () => {
    vi.mocked(refreshDb.getRefreshToken).mockResolvedValue(
      registro({ revocadoEn: Date.now() - 1000, motivoRevocacion: "rotado" }),
    );

    const resultado = await sesiones.rotarSesion(cookie, "", "");

    expect(resultado).toMatchObject({ ok: true, refreshCookie: null });
    expect(refreshDb.crearRefreshToken).not.toHaveBeenCalled();
    expect(refreshDb.revocarFamilia).not.toHaveBeenCalled();
  });

  it("un token revocado por logout no sirve", async () => {
    vi.mocked(refreshDb.getRefreshToken).mockResolvedValue(registro({ revocadoEn: Date.now() - 1000, motivoRevocacion: "logout" }));
    expect(await sesiones.rotarSesion(cookie, "", "")).toEqual({ ok: false, motivo: "revocado" });
  });

  it("un token vencido no sirve", async () => {
    vi.mocked(refreshDb.getRefreshToken).mockResolvedValue(registro({ expiraEn: Date.now() - 1 }));
    expect(await sesiones.rotarSesion(cookie, "", "")).toEqual({ ok: false, motivo: "expirado" });
  });

  it("si la cuenta ya no está habilitada cierra todas sus sesiones", async () => {
    vi.mocked(refreshDb.getRefreshToken).mockResolvedValue(registro());
    vi.mocked(getUsuarioPorId).mockResolvedValue(crearUsuario({ activo: false }));

    expect(await sesiones.rotarSesion(cookie, "", "")).toEqual({ ok: false, motivo: "cuenta" });
    expect(refreshDb.revocarTodosDelUsuario).toHaveBeenCalledWith(IDS.usuario, "cuenta");
  });
});

describe("revocarSesionActual (logout)", () => {
  it("revoca el refresh token de la cookie y devuelve el usuario", async () => {
    const secreto = generarTokenSeguro();
    vi.mocked(refreshDb.getRefreshToken).mockResolvedValue({
      id: IDS.refreshToken,
      tokenHash: sha256(secreto),
      usuarioId: IDS.usuario,
      familia: "f",
      expiraEn: Date.now() + 1000,
      revocadoEn: 0,
      motivoRevocacion: "",
      authTime: 0,
      creadoEn: 0,
    });

    expect(await sesiones.revocarSesionActual(`${IDS.refreshToken}.${secreto}`)).toBe(IDS.usuario);
    expect(refreshDb.revocarRefreshToken).toHaveBeenCalledWith(IDS.refreshToken, "logout");
  });

  it("sin cookie no hace nada", async () => {
    expect(await sesiones.revocarSesionActual(undefined)).toBeNull();
  });
});
