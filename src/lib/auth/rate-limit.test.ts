import { beforeEach, describe, expect, it, vi } from "vitest";
import { consumir, contar, incrementar, reiniciar } from "./rate-limit";
import { limpiarRateLimit } from "@test/rate-limit";

describe("rate limit en memoria", () => {
  beforeEach(limpiarRateLimit);

  it("permite hasta el límite y bloquea el siguiente intento", async () => {
    for (let i = 0; i < 3; i++) expect((await consumir("k", 3, 60_000)).permitido).toBe(true);
    const cuarto = await consumir("k", 3, 60_000);
    expect(cuarto).toMatchObject({ permitido: false, conteo: 4, restantes: 0 });
  });

  it("la ventana se reinicia al vencer", async () => {
    vi.useFakeTimers();
    await incrementar("k", 1000);
    await incrementar("k", 1000);
    expect(await contar("k")).toBe(2);
    vi.advanceTimersByTime(1001);
    expect(await contar("k")).toBe(0);
    expect(await incrementar("k", 1000)).toBe(1);
  });

  it("reiniciar borra el contador", async () => {
    await incrementar("k", 60_000);
    await reiniciar("k");
    expect(await contar("k")).toBe(0);
  });
});
