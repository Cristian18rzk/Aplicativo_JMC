import { beforeEach, describe, expect, it, vi } from "vitest";
import { crearUsuario } from "@test/fabricas";
import { limpiarRateLimit } from "@test/rate-limit";

// Tareas que el código deja para después de responder (next/server `after`): se ejecutan a mano
const tareasPendientes = vi.hoisted(() => [] as Array<() => unknown>);
vi.mock("next/server", async (original) => ({
  ...(await original<typeof import("next/server")>()),
  after: (tarea: () => unknown) => void tareasPendientes.push(tarea),
}));
vi.mock("@/lib/airtable/usuarios", () => ({ getUsuarioPorCedula: vi.fn(), actualizarUsuario: vi.fn() }));
vi.mock("@/lib/airtable/auth-logs", () => ({ registrarEventoAuth: vi.fn() }));
vi.mock("./password", () => ({ verificarPassword: vi.fn(), compararSenuelo: vi.fn() }));
vi.mock("./sesiones", () => ({ cuentaHabilitada: vi.fn(), fichaActiva: vi.fn() }));
// Sin esperas reales del retardo progresivo
vi.mock("./request", async (original) => ({ ...(await original<typeof import("./request")>()), esperar: vi.fn() }));

const { getUsuarioPorCedula, actualizarUsuario } = await import("@/lib/airtable/usuarios");
const { verificarPassword, compararSenuelo } = await import("./password");
const { cuentaHabilitada, fichaActiva } = await import("./sesiones");
const { esperar } = await import("./request");
const { autenticar } = await import("./login");
const { BLOQUEO_TEMPORAL_MS, MAX_FALLOS_ACUMULADOS, MAX_FALLOS_CUENTA, MAX_LOGINS_POR_IP } = await import("./constantes");

const ctx = { ip: "10.0.0.1", userAgent: "vitest" };
const ejecutarPendientes = async () => {
  for (const tarea of tareasPendientes.splice(0)) await tarea();
};
const ultimosCambios = () => vi.mocked(actualizarUsuario).mock.lastCall?.[1];

beforeEach(() => {
  limpiarRateLimit();
  tareasPendientes.length = 0;
  vi.mocked(cuentaHabilitada).mockResolvedValue(true);
  vi.mocked(fichaActiva).mockResolvedValue(true);
  vi.mocked(actualizarUsuario).mockImplementation(async (id, cambios) => crearUsuario({ id, ...cambios }));
});

describe("autenticar", () => {
  it("ingresa con la cédula y el PIN correctos", async () => {
    vi.mocked(getUsuarioPorCedula).mockResolvedValue(crearUsuario());
    vi.mocked(verificarPassword).mockResolvedValue(true);

    const resultado = await autenticar("1098765432", "4829", ctx);

    expect(resultado).toMatchObject({ ok: true, usuario: { id: crearUsuario().id } });
  });

  it("al acertar reinicia los contadores de fallos", async () => {
    vi.mocked(getUsuarioPorCedula).mockResolvedValue(crearUsuario({ failedLoginAttempts: 3, totalFailedAttempts: 4 }));
    vi.mocked(verificarPassword).mockResolvedValue(true);

    await autenticar("1098765432", "4829", ctx);

    expect(ultimosCambios()).toEqual({ failedLoginAttempts: 0, failedWindowStart: 0, totalFailedAttempts: 0, lockedUntil: 0 });
  });

  it("con una cédula inexistente responde 'credenciales' y compara contra el hash señuelo", async () => {
    vi.mocked(getUsuarioPorCedula).mockResolvedValue(null);

    expect(await autenticar("1111111111", "4829", ctx)).toEqual({ ok: false, motivo: "credenciales" });
    expect(compararSenuelo).toHaveBeenCalledWith("4829");
  });

  it("con el PIN incorrecto responde 'credenciales' y suma un fallo a la cuenta", async () => {
    vi.mocked(getUsuarioPorCedula).mockResolvedValue(crearUsuario());
    vi.mocked(verificarPassword).mockResolvedValue(false);

    expect(await autenticar("1098765432", "0000", ctx)).toEqual({ ok: false, motivo: "credenciales" });
    await ejecutarPendientes();

    expect(ultimosCambios()).toMatchObject({ failedLoginAttempts: 1, totalFailedAttempts: 1 });
  });

  it(`al fallo número ${MAX_FALLOS_CUENTA} dentro de la ventana bloquea la cuenta 30 minutos`, async () => {
    const ahora = Date.now();
    vi.mocked(getUsuarioPorCedula).mockResolvedValue(
      crearUsuario({ failedLoginAttempts: MAX_FALLOS_CUENTA - 1, failedWindowStart: ahora - 1000, totalFailedAttempts: 4 }),
    );
    vi.mocked(verificarPassword).mockResolvedValue(false);

    await autenticar("1098765432", "0000", ctx);
    await ejecutarPendientes();

    const cambios = ultimosCambios();
    expect(cambios?.lockedUntil).toBeGreaterThanOrEqual(ahora + BLOQUEO_TEMPORAL_MS);
    expect(cambios?.lockedPermanently).toBeUndefined();
  });

  it("si la ventana de 15 minutos ya pasó, el conteo vuelve a empezar", async () => {
    vi.mocked(getUsuarioPorCedula).mockResolvedValue(
      crearUsuario({ failedLoginAttempts: 4, failedWindowStart: Date.now() - 16 * 60_000, totalFailedAttempts: 4 }),
    );
    vi.mocked(verificarPassword).mockResolvedValue(false);

    await autenticar("1098765432", "0000", ctx);
    await ejecutarPendientes();

    expect(ultimosCambios()).toMatchObject({ failedLoginAttempts: 1 });
    expect(ultimosCambios()?.lockedUntil).toBeUndefined();
  });

  it(`al fallo acumulado número ${MAX_FALLOS_ACUMULADOS} bloquea la cuenta hasta que el admin intervenga`, async () => {
    vi.mocked(getUsuarioPorCedula).mockResolvedValue(crearUsuario({ totalFailedAttempts: MAX_FALLOS_ACUMULADOS - 1 }));
    vi.mocked(verificarPassword).mockResolvedValue(false);

    await autenticar("1098765432", "0000", ctx);
    await ejecutarPendientes();

    expect(ultimosCambios()).toMatchObject({ lockedPermanently: true });
  });

  it("una cuenta bloqueada no ingresa aunque el PIN sea correcto (y aun así se compara el PIN)", async () => {
    vi.mocked(getUsuarioPorCedula).mockResolvedValue(crearUsuario({ lockedUntil: Date.now() + 60_000 }));
    vi.mocked(verificarPassword).mockResolvedValue(true);

    expect(await autenticar("1098765432", "4829", ctx)).toEqual({ ok: false, motivo: "credenciales" });
    expect(verificarPassword).toHaveBeenCalled();
  });

  it("una cuenta con bloqueo permanente no ingresa", async () => {
    vi.mocked(getUsuarioPorCedula).mockResolvedValue(crearUsuario({ lockedPermanently: true }));
    vi.mocked(verificarPassword).mockResolvedValue(true);

    expect(await autenticar("1098765432", "4829", ctx)).toEqual({ ok: false, motivo: "credenciales" });
  });

  it("con el PIN correcto pero la cuenta o la ficha inactiva no ingresa", async () => {
    vi.mocked(getUsuarioPorCedula).mockResolvedValue(crearUsuario());
    vi.mocked(verificarPassword).mockResolvedValue(true);
    vi.mocked(cuentaHabilitada).mockResolvedValue(false);

    expect(await autenticar("1098765432", "4829", ctx)).toEqual({ ok: false, motivo: "credenciales" });
  });

  describe("primer ingreso (cuenta sin PIN)", () => {
    it("envía a crear el PIN si la cuenta está activa y su ficha también", async () => {
      vi.mocked(getUsuarioPorCedula).mockResolvedValue(crearUsuario({ passwordHash: "" }));

      const resultado = await autenticar("1098765432", "", ctx);

      expect(resultado).toMatchObject({ ok: false, motivo: "cambiar_pin" });
      expect(ultimosCambios()).toEqual({ debeCambiarPin: true, pinTemporalExpira: 0 });
    });

    it("rechaza si la ficha del colaborador no está activa", async () => {
      vi.mocked(getUsuarioPorCedula).mockResolvedValue(crearUsuario({ passwordHash: "" }));
      vi.mocked(fichaActiva).mockResolvedValue(false);

      expect(await autenticar("1098765432", "", ctx)).toEqual({ ok: false, motivo: "credenciales" });
    });

    it("rechaza si la cuenta está desactivada", async () => {
      vi.mocked(getUsuarioPorCedula).mockResolvedValue(crearUsuario({ passwordHash: "", activo: false }));

      expect(await autenticar("1098765432", "", ctx)).toEqual({ ok: false, motivo: "credenciales" });
    });
  });

  describe("PIN temporal generado por el admin", () => {
    it("vigente: envía a crear el PIN propio sin abrir sesión", async () => {
      const usuario = crearUsuario({ debeCambiarPin: true, pinTemporalExpira: Date.now() + 60_000 });
      vi.mocked(getUsuarioPorCedula).mockResolvedValue(usuario);
      vi.mocked(verificarPassword).mockResolvedValue(true);

      expect(await autenticar("1098765432", "482913", ctx)).toEqual({ ok: false, motivo: "cambiar_pin", usuario });
    });

    it("vencido: lo informa para que pida otro", async () => {
      vi.mocked(getUsuarioPorCedula).mockResolvedValue(
        crearUsuario({ debeCambiarPin: true, pinTemporalExpira: Date.now() - 1 }),
      );
      vi.mocked(verificarPassword).mockResolvedValue(true);

      expect(await autenticar("1098765432", "482913", ctx)).toEqual({ ok: false, motivo: "pin_vencido" });
    });
  });

  it(`después de ${MAX_LOGINS_POR_IP} intentos desde la misma IP rechaza sin consultar Airtable`, async () => {
    vi.mocked(getUsuarioPorCedula).mockResolvedValue(null);
    for (let i = 0; i < MAX_LOGINS_POR_IP; i++) await autenticar("1111111111", "0000", ctx);
    vi.mocked(getUsuarioPorCedula).mockClear();

    expect(await autenticar("1111111111", "0000", ctx)).toEqual({ ok: false, motivo: "limite_ip" });
    expect(getUsuarioPorCedula).not.toHaveBeenCalled();
  });

  it("aplica un retardo creciente tras fallos con la misma cédula", async () => {
    vi.mocked(getUsuarioPorCedula).mockResolvedValue(null);
    for (let i = 0; i < 4; i++) await autenticar("1111111111", "0000", ctx);

    expect(vi.mocked(esperar).mock.calls.map(([ms]) => ms)).toEqual([0, 1000, 2000, 4000]);
  });
});
