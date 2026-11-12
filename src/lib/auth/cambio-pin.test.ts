import { beforeEach, describe, expect, it, vi } from "vitest";
import { IDS, crearUsuario } from "@test/fabricas";
import { limpiarRateLimit } from "@test/rate-limit";

vi.mock("@/lib/airtable/usuarios", () => ({ actualizarUsuario: vi.fn(), getUsuarioPorTokenCambio: vi.fn() }));
vi.mock("@/lib/airtable/refresh-tokens", () => ({ revocarTodosDelUsuario: vi.fn().mockResolvedValue(0) }));
vi.mock("@/lib/airtable/auth-logs", () => ({ registrarEventoAuth: vi.fn() }));
vi.mock("./password", () => ({ hashPassword: vi.fn(async (s: string) => `hash(${s})`) }));

const { actualizarUsuario, getUsuarioPorTokenCambio } = await import("@/lib/airtable/usuarios");
const { revocarTodosDelUsuario } = await import("@/lib/airtable/refresh-tokens");
const { sha256 } = await import("./tokens");
const { MAX_INTENTOS_CAMBIO_PIN_POR_IP, VIGENCIA_PIN_TEMPORAL_MS } = await import("./constantes");
const { crearPinPropio, emitirTokenCambioPin, generarPinTemporal, validarTokenCambioPin, MENSAJE_TOKEN_INVALIDO } =
  await import("./cambio-pin");

const ctx = { ip: "10.0.0.1", userAgent: "vitest" };
const ultimosCambios = () => vi.mocked(actualizarUsuario).mock.lastCall?.[1];

/** Cuenta pendiente de crear su PIN, con el hash del token guardado como lo deja emitirTokenCambioPin. */
function cuentaConToken(token: string, cambios = {}) {
  return crearUsuario({
    debeCambiarPin: true,
    tokenCambioHash: sha256(token),
    tokenCambioExpira: Date.now() + 60_000,
    ...cambios,
  });
}

beforeEach(() => {
  limpiarRateLimit();
  vi.mocked(actualizarUsuario).mockImplementation(async (id, cambios) => crearUsuario({ id, ...cambios }));
});

describe("generarPinTemporal", () => {
  it("genera un PIN de 6 dígitos que vence en 7 días, desbloquea la cuenta y cierra sus sesiones", async () => {
    const usuario = crearUsuario({ lockedPermanently: true, totalFailedAttempts: 10 });

    const { pin, expira } = await generarPinTemporal(usuario, IDS.otroUsuario, ctx);

    expect(pin).toMatch(/^\d{6}$/);
    expect(expira - Date.now()).toBeGreaterThan(VIGENCIA_PIN_TEMPORAL_MS - 5000);
    expect(ultimosCambios()).toMatchObject({
      passwordHash: `hash(${pin})`,
      debeCambiarPin: true,
      lockedPermanently: false,
      lockedUntil: 0,
      totalFailedAttempts: 0,
      tokenCambioHash: "",
    });
    expect(revocarTodosDelUsuario).toHaveBeenCalledWith(usuario.id, "admin");
  });
});

describe("emitirTokenCambioPin", () => {
  it("guarda solo el hash del token, nunca el token", async () => {
    const token = await emitirTokenCambioPin(crearUsuario());

    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(ultimosCambios()?.tokenCambioHash).toBe(sha256(token));
    expect(JSON.stringify(ultimosCambios())).not.toContain(token);
  });
});

describe("validarTokenCambioPin", () => {
  const token = "a".repeat(43);

  it("acepta un token vigente de una cuenta pendiente de crear PIN", async () => {
    vi.mocked(getUsuarioPorTokenCambio).mockResolvedValue(cuentaConToken(token));
    expect(await validarTokenCambioPin(token)).not.toBeNull();
  });

  it.each([undefined, "", "corto", "a".repeat(44), "*".repeat(43)])("rechaza el formato %j sin consultar Airtable", async (t) => {
    expect(await validarTokenCambioPin(t)).toBeNull();
    expect(getUsuarioPorTokenCambio).not.toHaveBeenCalled();
  });

  it.each([
    ["vencido", { tokenCambioExpira: Date.now() - 1 }],
    ["de una cuenta inactiva", { activo: false }],
    ["de una cuenta con bloqueo permanente", { lockedPermanently: true }],
    ["de una cuenta que ya creó su PIN", { debeCambiarPin: false }],
  ])("rechaza un token %s", async (_, cambios) => {
    vi.mocked(getUsuarioPorTokenCambio).mockResolvedValue(cuentaConToken(token, cambios));
    expect(await validarTokenCambioPin(token)).toBeNull();
  });
});

describe("crearPinPropio", () => {
  const token = "b".repeat(43);

  it("guarda el PIN nuevo, consume el token (un solo uso) y cierra las sesiones", async () => {
    vi.mocked(getUsuarioPorTokenCambio).mockResolvedValue(cuentaConToken(token, { cedula: "1045903712" }));

    const resultado = await crearPinPropio(token, "4829", ctx);

    expect(resultado).toEqual({ ok: true, cedula: "1045903712" });
    expect(ultimosCambios()).toMatchObject({
      passwordHash: "hash(4829)",
      debeCambiarPin: false,
      tokenCambioHash: "",
      tokenCambioExpira: 0,
    });
    expect(revocarTodosDelUsuario).toHaveBeenCalledWith(crearUsuario().id, "password");
  });

  it("con un token inválido responde 400 sin cambiar nada", async () => {
    vi.mocked(getUsuarioPorTokenCambio).mockResolvedValue(null);

    expect(await crearPinPropio(token, "4829", ctx)).toEqual({ ok: false, estado: 400, error: MENSAJE_TOKEN_INVALIDO });
    expect(actualizarUsuario).not.toHaveBeenCalled();
  });

  it("rechaza un PIN que está dentro de la cédula", async () => {
    vi.mocked(getUsuarioPorTokenCambio).mockResolvedValue(cuentaConToken(token, { cedula: "1045903712" }));

    const resultado = await crearPinPropio(token, "5903", ctx);

    expect(resultado).toMatchObject({ ok: false, estado: 400, detalles: { pin: ["No uses números de tu cédula"] } });
    expect(actualizarUsuario).not.toHaveBeenCalled();
  });

  it(`después de ${MAX_INTENTOS_CAMBIO_PIN_POR_IP} intentos desde la misma IP responde 429`, async () => {
    vi.mocked(getUsuarioPorTokenCambio).mockResolvedValue(null);
    for (let i = 0; i < MAX_INTENTOS_CAMBIO_PIN_POR_IP; i++) await crearPinPropio(token, "4829", ctx);

    expect(await crearPinPropio(token, "4829", ctx)).toMatchObject({ ok: false, estado: 429 });
  });
});
