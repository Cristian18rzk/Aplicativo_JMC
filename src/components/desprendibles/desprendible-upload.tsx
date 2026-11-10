"use client";

import { ArrowLeft, CircleCheck, CircleX, FileSpreadsheet, FileUp, RefreshCw, Upload } from "lucide-react";
import { useMemo, useRef, useState, type DragEvent } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { calcularLiquidacion } from "@/lib/nomina";
import { cn, formatCurrency, normalizarTexto, periodoActual } from "@/lib/utils";
import { desprendibleBulkRowSchema } from "@/lib/validators/desprendible";
import { TIPOS_PERIODO, type DesprendibleBulkRow, type TipoPeriodo } from "@/types/desprendible";

// ─── Definición de campos importables ────────────────────────────────

type ClaveCampo = keyof DesprendibleBulkRow;

interface CampoImportable {
  clave: ClaveCampo;
  etiqueta: string;
  obligatorio?: boolean;
  alias: string[];
}

const CAMPOS: CampoImportable[] = [
  { clave: "cedula", etiqueta: "Cédula", obligatorio: true, alias: ["cedula", "documento", "cc", "identificacion", "numero documento"] },
  { clave: "periodo", etiqueta: "Periodo (AAAA-MM)", alias: ["periodo", "mes", "periodo pago"] },
  { clave: "tipo_periodo", etiqueta: "Tipo de periodo", alias: ["tipo periodo", "tipo", "quincena"] },
  { clave: "salario_base", etiqueta: "Salario base", alias: ["salario base", "salario", "sueldo", "basico"] },
  { clave: "dias_trabajados", etiqueta: "Días trabajados", alias: ["dias trabajados", "dias", "dias laborados"] },
  { clave: "horas_extras_diurnas", etiqueta: "Horas extras diurnas", alias: ["horas extras diurnas", "hed", "extras diurnas"] },
  { clave: "horas_extras_nocturnas", etiqueta: "Horas extras nocturnas", alias: ["horas extras nocturnas", "hen", "extras nocturnas"] },
  { clave: "recargos_nocturnos", etiqueta: "Recargos nocturnos", alias: ["recargos nocturnos", "recargo nocturno", "rn"] },
  { clave: "dominicales_festivos", etiqueta: "Dominicales y festivos", alias: ["dominicales festivos", "dominicales", "festivos"] },
  { clave: "auxilio_transporte", etiqueta: "Auxilio de transporte", alias: ["auxilio transporte", "auxilio", "aux transporte"] },
  { clave: "otros_devengados", etiqueta: "Otros devengados", alias: ["otros devengados", "bonificacion", "otros ingresos"] },
  { clave: "descripcion_otros", etiqueta: "Descripción otros devengados", alias: ["descripcion otros", "concepto otros"] },
  { clave: "deduccion_salud", etiqueta: "Deducción salud", alias: ["deduccion salud", "salud", "eps"] },
  { clave: "deduccion_pension", etiqueta: "Deducción pensión", alias: ["deduccion pension", "pension"] },
  { clave: "retencion_fuente", etiqueta: "Retención en la fuente", alias: ["retencion fuente", "retencion", "retefuente"] },
  { clave: "otros_descuentos", etiqueta: "Otros descuentos", alias: ["otros descuentos", "descuentos", "libranza"] },
  { clave: "descripcion_descuentos", etiqueta: "Descripción descuentos", alias: ["descripcion descuentos", "concepto descuentos"] },
];

const TAMANO_MAXIMO = 5 * 1024 * 1024; // 5 MB
const EXTENSIONES = [".xlsx", ".xls", ".csv"];

type FilaCruda = Record<string, unknown>;
type Mapeo = Partial<Record<ClaveCampo, string>>;

interface FilaPrevia {
  numero: number;
  datos: DesprendibleBulkRow | null;
  cruda: Record<string, unknown>;
  error?: string;
}

const normalizarEncabezado = (t: string) => normalizarTexto(t).replace(/[_\-.]+/g, " ").replace(/\s+/g, " ");

/** Detecta automáticamente qué columna del archivo corresponde a cada campo. */
function detectarMapeo(columnas: string[]): Mapeo {
  const mapeo: Mapeo = {};
  const usadas = new Set<string>();
  for (const campo of CAMPOS) {
    const candidatos = [normalizarEncabezado(campo.clave), ...campo.alias.map(normalizarEncabezado)];
    const columna = columnas.find((c) => !usadas.has(c) && candidatos.includes(normalizarEncabezado(c)));
    if (columna) {
      mapeo[campo.clave] = columna;
      usadas.add(columna);
    }
  }
  return mapeo;
}

/** Normaliza el periodo: fecha de Excel, "2026-03-01", "03/2026", "2026/3" → "2026-03". */
function normalizarPeriodo(valor: unknown): unknown {
  if (valor instanceof Date && !Number.isNaN(valor.getTime())) {
    return `${valor.getFullYear()}-${String(valor.getMonth() + 1).padStart(2, "0")}`;
  }
  if (typeof valor !== "string" && typeof valor !== "number") return valor;
  const texto = String(valor).trim();
  let m = /^(\d{4})[-/](\d{1,2})(?:[-/]\d{1,2})?/.exec(texto);
  if (m) return `${m[1]}-${m[2].padStart(2, "0")}`;
  m = /^(\d{1,2})[-/](\d{4})$/.exec(texto);
  if (m) return `${m[2]}-${m[1].padStart(2, "0")}`;
  return texto;
}

/** Normaliza el tipo de periodo: "Q1", "quincena 1", "1" → "Quincenal 1". */
function normalizarTipo(valor: unknown): unknown {
  if (valor === undefined || valor === null) return valor;
  const t = normalizarTexto(String(valor));
  if (/^(q|quincena|quincenal|primera)?\s*1$|^1\s*q$|^primera quincena$/.test(t)) return "Quincenal 1";
  if (/^(q|quincena|quincenal|segunda)?\s*2$|^2\s*q$|^segunda quincena$/.test(t)) return "Quincenal 2";
  if (/^(m|mes|mensual)$/.test(t)) return "Mensual";
  return TIPOS_PERIODO.find((tp) => normalizarTexto(tp) === t) ?? valor;
}

function construirFila(
  cruda: FilaCruda,
  mapeo: Mapeo,
  periodoDefecto: string,
  tipoDefecto: TipoPeriodo,
): Record<string, unknown> {
  const fila: Record<string, unknown> = {};
  for (const campo of CAMPOS) {
    const columna = mapeo[campo.clave];
    if (!columna) continue;
    const valor = cruda[columna];
    if (valor === "" || valor === null || valor === undefined) continue;
    fila[campo.clave] = typeof valor === "string" ? valor.trim() : valor;
  }
  fila.periodo = normalizarPeriodo(fila.periodo ?? periodoDefecto);
  fila.tipo_periodo = normalizarTipo(fila.tipo_periodo ?? tipoDefecto);
  if (fila.dias_trabajados === undefined) fila.dias_trabajados = fila.tipo_periodo === "Mensual" ? 30 : 15;
  return fila;
}

// ─── Componente ──────────────────────────────────────────────────────

interface DesprendibleUploadProps {
  onConfirmar: (filas: DesprendibleBulkRow[], calcularAportes: boolean) => Promise<void>;
  enviando?: boolean;
}

/** Cargue masivo: arrastrar archivo → mapear columnas → previsualizar → confirmar. */
export function DesprendibleUpload({ onConfirmar, enviando = false }: DesprendibleUploadProps) {
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [arrastrando, setArrastrando] = useState(false);
  const [leyendo, setLeyendo] = useState(false);
  const [archivo, setArchivo] = useState<string>("");
  const [columnas, setColumnas] = useState<string[]>([]);
  const [filasCrudas, setFilasCrudas] = useState<FilaCruda[]>([]);
  const [mapeo, setMapeo] = useState<Mapeo>({});
  const [periodoDefecto, setPeriodoDefecto] = useState(periodoActual());
  const [tipoDefecto, setTipoDefecto] = useState<TipoPeriodo>("Mensual");
  const [calcularAportes, setCalcularAportes] = useState(true);
  const [paso, setPaso] = useState<"archivo" | "mapeo" | "previa">("archivo");
  const [soloErrores, setSoloErrores] = useState(false);

  const procesarArchivo = async (file: File) => {
    const extension = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
    if (!EXTENSIONES.includes(extension)) {
      toast.error("Formato no soportado", { descripcion: "Use archivos .xlsx, .xls o .csv" });
      return;
    }
    if (file.size > TAMANO_MAXIMO) {
      toast.error("Archivo demasiado grande", { descripcion: "El tamaño máximo es 5 MB" });
      return;
    }
    setLeyendo(true);
    try {
      const XLSX = await import("xlsx");
      const buffer = await file.arrayBuffer();
      const libro = XLSX.read(buffer, { type: "array", cellDates: true, codepage: 65001 });
      const hoja = libro.Sheets[libro.SheetNames[0]];
      if (!hoja) throw new Error("El archivo no tiene hojas");
      const filas = XLSX.utils.sheet_to_json<FilaCruda>(hoja, { defval: "", raw: true });
      const filasConDatos = filas.filter((f) => Object.values(f).some((v) => String(v).trim() !== ""));
      if (filasConDatos.length === 0) throw new Error("No se encontraron filas con datos");
      if (filasConDatos.length > 1000) throw new Error("Máximo 1.000 filas por cargue");

      const encabezados = Object.keys(filasConDatos[0]).filter((c) => !c.startsWith("__EMPTY"));
      setArchivo(file.name);
      setColumnas(encabezados);
      setFilasCrudas(filasConDatos);
      setMapeo(detectarMapeo(encabezados));
      setPaso("mapeo");
      toast.info(`${filasConDatos.length} filas leídas`, { descripcion: "Revise el mapeo de columnas" });
    } catch (error) {
      toast.error("No fue posible leer el archivo", {
        descripcion: error instanceof Error ? error.message : "Verifique el formato",
      });
    } finally {
      setLeyendo(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const alSoltar = (e: DragEvent) => {
    e.preventDefault();
    setArrastrando(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void procesarArchivo(file);
  };

  const filasPrevias: FilaPrevia[] = useMemo(
    () =>
      filasCrudas.map((cruda, i) => {
        const construida = construirFila(cruda, mapeo, periodoDefecto, tipoDefecto);
        const resultado = desprendibleBulkRowSchema.safeParse(construida);
        return resultado.success
          ? { numero: i + 2, datos: resultado.data as DesprendibleBulkRow, cruda: construida }
          : {
              numero: i + 2,
              datos: null,
              cruda: construida,
              error: resultado.error.issues
                .map((iss) => (iss.path.length ? `${String(iss.path[0])}: ${iss.message}` : iss.message))
                .join("; "),
            };
      }),
    [filasCrudas, mapeo, periodoDefecto, tipoDefecto],
  );

  const validas = filasPrevias.filter((f) => f.datos);
  const invalidas = filasPrevias.length - validas.length;
  const visibles = (soloErrores ? filasPrevias.filter((f) => f.error) : filasPrevias).slice(0, 200);

  const reiniciar = () => {
    setPaso("archivo");
    setArchivo("");
    setColumnas([]);
    setFilasCrudas([]);
    setMapeo({});
  };

  const descargarPlantilla = async () => {
    const XLSX = await import("xlsx");
    const ejemplo = [
      {
        cedula: "1020304050",
        periodo: periodoActual(),
        tipo_periodo: "Mensual",
        salario_base: 1750905,
        dias_trabajados: 30,
        horas_extras_diurnas: 4,
        horas_extras_nocturnas: 0,
        recargos_nocturnos: 0,
        dominicales_festivos: 0,
        auxilio_transporte: 249095,
        otros_devengados: 0,
        descripcion_otros: "",
        deduccion_salud: "",
        deduccion_pension: "",
        retencion_fuente: 0,
        otros_descuentos: 0,
        descripcion_descuentos: "",
      },
    ];
    const hoja = XLSX.utils.json_to_sheet(ejemplo);
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, "Desprendibles");
    XLSX.writeFile(libro, "plantilla_desprendibles.xlsx");
  };

  // ── Paso 1: archivo ──
  if (paso === "archivo") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>1. Seleccione el archivo</CardTitle>
          <CardDescription>
            Excel (.xlsx, .xls) o CSV con una fila de encabezados. Cada fila es un desprendible identificado por cédula.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            role="button"
            tabIndex={0}
            onClick={() => inputRef.current?.click()}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setArrastrando(true);
            }}
            onDragLeave={() => setArrastrando(false)}
            onDrop={alSoltar}
            className={cn(
              "flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed px-6 py-12 text-center transition-colors",
              arrastrando ? "border-acento bg-acento-suave" : "border-borde hover:border-acento hover:bg-slate-50",
            )}
          >
            {leyendo ? (
              <RefreshCw className="h-10 w-10 animate-spin text-acento" aria-hidden />
            ) : (
              <FileUp className="h-10 w-10 text-acento" aria-hidden />
            )}
            <div>
              <p className="font-medium text-texto">
                {leyendo ? "Leyendo archivo…" : "Arrastre el archivo aquí o haga clic para seleccionarlo"}
              </p>
              <p className="text-sm text-texto-suave">Máximo 5 MB y 1.000 filas</p>
            </div>
            <input
              ref={inputRef}
              type="file"
              accept={EXTENSIONES.join(",")}
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void procesarArchivo(file);
              }}
            />
          </div>
          <Button variante="ghost" tamano="sm" onClick={descargarPlantilla}>
            <FileSpreadsheet className="h-4 w-4" aria-hidden />
            Descargar plantilla de ejemplo
          </Button>
        </CardContent>
      </Card>
    );
  }

  // ── Paso 2: mapeo ──
  if (paso === "mapeo") {
    const faltaCedula = !mapeo.cedula;
    return (
      <Card>
        <CardHeader>
          <CardTitle>2. Mapee las columnas</CardTitle>
          <CardDescription>
            Archivo <span className="font-medium text-texto">{archivo}</span> · {filasCrudas.length} filas. Asocie cada
            campo con una columna del archivo. Los campos sin columna toman su valor por defecto.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 rounded-lg bg-slate-50 p-4 sm:grid-cols-3">
            <Input
              label="Periodo por defecto"
              type="month"
              value={periodoDefecto}
              onChange={(e) => setPeriodoDefecto(e.target.value)}
              ayuda="Si el archivo no trae columna de periodo"
            />
            <Select
              label="Tipo de periodo por defecto"
              opciones={TIPOS_PERIODO}
              value={tipoDefecto}
              onChange={(e) => setTipoDefecto(e.target.value as TipoPeriodo)}
            />
            <label className="flex items-start gap-2 pt-7 text-sm">
              <input
                type="checkbox"
                checked={calcularAportes}
                onChange={(e) => setCalcularAportes(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-borde accent-acento"
              />
              <span>Calcular salud y pensión (4%) cuando la fila no los traiga</span>
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {CAMPOS.map((campo) => (
              <Select
                key={campo.clave}
                label={campo.etiqueta}
                required={campo.obligatorio}
                placeholder="— No importar —"
                opciones={columnas}
                value={mapeo[campo.clave] ?? ""}
                onChange={(e) => setMapeo((m) => ({ ...m, [campo.clave]: e.target.value || undefined }))}
                error={campo.obligatorio && !mapeo[campo.clave] ? "Campo obligatorio" : undefined}
              />
            ))}
          </div>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
            <Button variante="secondary" onClick={reiniciar}>
              <ArrowLeft className="h-4 w-4" aria-hidden />
              Cambiar archivo
            </Button>
            <Button onClick={() => setPaso("previa")} disabled={faltaCedula}>
              Previsualizar
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ── Paso 3: previsualización ──
  return (
    <Card>
      <CardHeader>
        <CardTitle>3. Previsualice y confirme</CardTitle>
        <CardDescription>
          La cédula, duplicados y colaboradores inexistentes se validan en el servidor al confirmar.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variante="success">
            <CircleCheck className="mr-1 h-3.5 w-3.5" aria-hidden />
            {validas.length} válidas
          </Badge>
          {invalidas > 0 ? (
            <Badge variante="destructive">
              <CircleX className="mr-1 h-3.5 w-3.5" aria-hidden />
              {invalidas} con errores
            </Badge>
          ) : null}
          {invalidas > 0 ? (
            <label className="ml-auto flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={soloErrores}
                onChange={(e) => setSoloErrores(e.target.checked)}
                className="h-4 w-4 accent-acento"
              />
              Mostrar solo filas con errores
            </label>
          ) : null}
        </div>

        <div className="max-h-[28rem] overflow-auto rounded-lg border border-borde">
          <Table>
            <TableHeader className="sticky top-0">
              <tr>
                <TableHead>Fila</TableHead>
                <TableHead>Cédula</TableHead>
                <TableHead>Periodo</TableHead>
                <TableHead>Días</TableHead>
                <TableHead className="text-right">Devengado*</TableHead>
                <TableHead className="text-right">Neto*</TableHead>
                <TableHead>Estado</TableHead>
              </tr>
            </TableHeader>
            <TableBody>
              {visibles.map((f) => {
                const liquidacion =
                  f.datos && f.datos.salario_base !== undefined
                    ? calcularLiquidacion({
                        salario_base: f.datos.salario_base ?? 0,
                        dias_trabajados: f.datos.dias_trabajados,
                        horas_extras_diurnas: f.datos.horas_extras_diurnas ?? 0,
                        horas_extras_nocturnas: f.datos.horas_extras_nocturnas ?? 0,
                        recargos_nocturnos: f.datos.recargos_nocturnos ?? 0,
                        dominicales_festivos: f.datos.dominicales_festivos ?? 0,
                        auxilio_transporte: f.datos.auxilio_transporte ?? 0,
                        otros_devengados: f.datos.otros_devengados ?? 0,
                        deduccion_salud: f.datos.deduccion_salud ?? 0,
                        deduccion_pension: f.datos.deduccion_pension ?? 0,
                        retencion_fuente: f.datos.retencion_fuente ?? 0,
                        otros_descuentos: f.datos.otros_descuentos ?? 0,
                      })
                    : null;
                return (
                  <TableRow key={f.numero} className={f.error ? "bg-red-50/60 hover:bg-red-50" : undefined}>
                    <TableCell className="text-texto-suave">{f.numero}</TableCell>
                    <TableCell className="font-mono text-xs">{String(f.cruda.cedula ?? "—")}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      {String(f.cruda.periodo ?? "")} · {String(f.cruda.tipo_periodo ?? "")}
                    </TableCell>
                    <TableCell>{String(f.cruda.dias_trabajados ?? "")}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {liquidacion ? formatCurrency(liquidacion.totalDevengado) : "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {liquidacion ? formatCurrency(liquidacion.netoAPagar) : "—"}
                    </TableCell>
                    <TableCell className="max-w-xs">
                      {f.error ? (
                        <span className="text-xs text-error">{f.error}</span>
                      ) : (
                        <Badge variante="success">OK</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        <p className="text-xs text-texto-suave">
          * Valores estimados. Si no hay columna de salario se usará el salario del colaborador, y los aportes se
          calculan en el servidor.{filasPrevias.length > 200 ? " Se muestran las primeras 200 filas." : ""}
        </p>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
          <Button variante="secondary" onClick={() => setPaso("mapeo")} disabled={enviando}>
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Volver al mapeo
          </Button>
          <Button
            onClick={() =>
              onConfirmar(
                validas.map((f) => ({ ...(f.datos as DesprendibleBulkRow), fila: f.numero })),
                calcularAportes,
              )
            }
            disabled={validas.length === 0}
            cargando={enviando}
          >
            {!enviando ? <Upload className="h-4 w-4" aria-hidden /> : null}
            Cargar {validas.length} desprendibles
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
