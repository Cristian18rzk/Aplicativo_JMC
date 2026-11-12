import { describe, expect, it } from "vitest";
import { erroresPin } from "./pin";

describe("erroresPin", () => {
  it("acepta un PIN de 4 dígitos sin patrones", () => {
    expect(erroresPin("4829")).toEqual([]);
  });

  it.each(["", "123", "12345", "12a4", " 482"])("rechaza %j por longitud o caracteres", (pin) => {
    expect(erroresPin(pin)).toEqual(["El PIN debe tener exactamente 4 números"]);
  });

  it.each([
    ["1111", "mismo número repetido"],
    ["1234", "números seguidos"],
    ["4321", "números seguidos"],
    ["8901", "números seguidos"], // la secuencia da la vuelta de 9 a 0
    ["1212", "mismo par"],
    ["1987", "año"],
    ["2024", "año"],
    ["2580", "muy común"],
  ])("rechaza %s (%s)", (pin) => {
    expect(erroresPin(pin)).toHaveLength(1);
  });

  it("rechaza un PIN que aparece dentro de la cédula", () => {
    expect(erroresPin("5903", "1045903712")).toEqual(["No uses números de tu cédula"]);
  });

  it("no compara contra la cédula si no se conoce", () => {
    expect(erroresPin("5903")).toEqual([]);
  });
});
