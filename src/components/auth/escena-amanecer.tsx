/**
 * Escena de la portada: amanecer sobre la plantación de palma de aceite.
 * Cielo de madrugada que se calienta hacia el horizonte, sol que sale detrás de las colinas,
 * hileras de palmas (la plantación) y palmas grandes en primer plano, con las copas meciéndose.
 * SVG puro y decorativo (aria-hidden). Se ancla abajo y se recorta a los lados (xMidYMax slice).
 */

// ─── Geometría de la palma ────────────────────────────────────────────

type Punto = [number, number];

/** Raquis de la hoja: curva cuadrática que sube y cae hacia la punta (unidad = 100). */
const P0: Punto = [0, 0];
const CTRL: Punto = [52, -34];
const P1: Punto = [100, 18];

const enCurva = (t: number): Punto => [
  (1 - t) ** 2 * P0[0] + 2 * (1 - t) * t * CTRL[0] + t * t * P1[0],
  (1 - t) ** 2 * P0[1] + 2 * (1 - t) * t * CTRL[1] + t * t * P1[1],
];
const tangente = (t: number): Punto => [
  2 * (1 - t) * (CTRL[0] - P0[0]) + 2 * t * (P1[0] - CTRL[0]),
  2 * (1 - t) * (CTRL[1] - P0[1]) + 2 * t * (P1[1] - CTRL[1]),
];

/** Foliolos a lo largo del raquis: largos y caídos por debajo, cortos por encima. */
function calcularFoliolos(): string {
  let d = "";
  for (let t = 0.1; t <= 0.98; t += 0.045) {
    const [x, y] = enCurva(t);
    const [tx, ty] = tangente(t);
    const n = Math.hypot(tx, ty);
    const ux = tx / n;
    const uy = ty / n;
    const largo = 30 * (1 - t * 0.6);
    for (const [grados, factor] of [
      [64, 1],
      [-46, 0.62],
    ] as const) {
      const r = (grados * Math.PI) / 180;
      const dx = (ux * Math.cos(r) - uy * Math.sin(r)) * largo * factor;
      const dy = (ux * Math.sin(r) + uy * Math.cos(r)) * largo * factor;
      d += `M${x.toFixed(1)} ${y.toFixed(1)}l${dx.toFixed(1)} ${dy.toFixed(1)}`;
    }
  }
  return d;
}

const RAQUIS = `M0 0Q${CTRL[0]} ${CTRL[1]} ${P1[0]} ${P1[1]}`;
const FOLIOLOS = calcularFoliolos();

/** Hojas de la copa: [ángulo, escala]. Se dibujan a la derecha y se reflejan a la izquierda. */
const HOJAS: [number, number][] = [
  [-72, 0.78],
  [-44, 0.95],
  [-16, 1.05],
  [12, 1],
  [38, 0.82],
];

function Hoja({ angulo, escala, espejo }: { angulo: number; escala: number; espejo?: boolean }) {
  return (
    <g transform={`${espejo ? "scale(-1 1) " : ""}rotate(${angulo}) scale(${escala})`}>
      <path d={RAQUIS} strokeWidth={3.2} />
      <path d={FOLIOLOS} strokeWidth={1.7} />
    </g>
  );
}

/**
 * Palma de aceite. (x, y) es la base del tronco; `alto` el largo del tronco en unidades locales.
 * `retraso` desfasa el vaivén para que las copas no se muevan al unísono.
 */
function Palma({
  x,
  y,
  escala = 1,
  alto = 230,
  color,
  retraso = 0,
  inclinacion = 0,
}: {
  x: number;
  y: number;
  escala?: number;
  alto?: number;
  color: string;
  retraso?: number;
  inclinacion?: number;
}) {
  const h = alto;
  return (
    <g transform={`translate(${x} ${y}) scale(${escala}) rotate(${inclinacion})`} fill={color} stroke={color}>
      {/* Tronco con las bases de las hojas viejas */}
      <path
        d={`M-7 ${-h}C-9 ${-h * 0.55} -6 ${-h * 0.2} -13 0L13 0C7 ${-h * 0.2} 9 ${-h * 0.55} 7 ${-h}Z`}
        strokeWidth={0}
      />
      {Array.from({ length: Math.floor(h / 26) }, (_, i) => (
        <path
          key={i}
          d={`M${-10 + (i % 2) * 2} ${-h + 18 + i * 26}l${9} ${-7}l${9} ${7}`}
          fill="none"
          strokeWidth={2.4}
          strokeLinecap="round"
          opacity={0.9}
        />
      ))}
      <g transform={`translate(0 ${-h})`}>
        <g className="escena-copa" style={{ animationDelay: `${retraso}s` }} fill="none" strokeLinecap="round">
          {HOJAS.map(([a, e]) => (
            <Hoja key={`d${a}`} angulo={a} escala={e} />
          ))}
          {HOJAS.map(([a, e]) => (
            <Hoja key={`i${a}`} angulo={a} escala={e} espejo />
          ))}
          <Hoja angulo={-96} escala={0.6} />
          <ellipse rx={11} ry={9} fill={color} strokeWidth={0} />
          {/* Racimo de fruto bajo la copa */}
          <ellipse cx={-6} cy={12} rx={8} ry={10} fill={color} strokeWidth={0} />
        </g>
      </g>
    </g>
  );
}

// ─── Escena ───────────────────────────────────────────────────────────

/** Hilera de la plantación: palmas pequeñas, regulares, con leve variación. */
function Hilera({ y, desde, hasta, paso, escala, color, alto }: {
  y: number;
  desde: number;
  hasta: number;
  paso: number;
  escala: number;
  color: string;
  alto: number;
}) {
  const palmas = [];
  for (let x = desde, i = 0; x <= hasta; x += paso, i++) {
    const variacion = ((i * 37) % 11) / 11; // pseudoaleatorio estable (mismo resultado en servidor y cliente)
    palmas.push(
      <Palma
        key={x}
        x={x + variacion * paso * 0.3}
        y={y + variacion * 6}
        escala={escala * (0.88 + variacion * 0.24)}
        alto={alto}
        color={color}
        retraso={-variacion * 6}
        inclinacion={(variacion - 0.5) * 6}
      />,
    );
  }
  return <g>{palmas}</g>;
}

/** Estrellas del cielo de madrugada: [x, y, radio, retraso del titileo]. */
const ESTRELLAS: [number, number, number, number][] = [
  [90, 60, 1.2, 0], [210, 140, 0.9, -1.5], [330, 40, 1.4, -3], [470, 110, 1, -0.8], [560, 30, 0.8, -2.2],
  [640, 170, 1.1, -4], [760, 70, 1.3, -1], [880, 130, 0.9, -3.4], [960, 40, 1.2, -0.4], [1060, 160, 1, -2.8],
  [1150, 80, 1.4, -1.8], [1260, 30, 0.9, -3.8], [1340, 140, 1.1, -0.6], [1410, 70, 0.8, -2.5], [40, 200, 0.9, -1.2],
  [400, 220, 0.8, -3.1], [1000, 240, 0.8, -0.9], [1220, 210, 1, -2], [720, 250, 0.7, -4.2], [150, 300, 0.7, -2.7],
];

export function EscenaAmanecer({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 1440 900"
      preserveAspectRatio="xMidYMax slice"
      aria-hidden
      focusable="false"
    >
      <defs>
        <linearGradient id="escena-cielo" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0B1F12" />
          <stop offset="0.32" stopColor="#143a22" />
          <stop offset="0.55" stopColor="#3f5a2c" />
          <stop offset="0.68" stopColor="#b8692a" />
          <stop offset="0.78" stopColor="#F2A042" />
          <stop offset="0.86" stopColor="#F9C46B" />
        </linearGradient>
        <radialGradient id="escena-halo" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#FFE7B0" stopOpacity="0.9" />
          <stop offset="0.35" stopColor="#F9C46B" stopOpacity="0.45" />
          <stop offset="1" stopColor="#E8782A" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="escena-sol" cx="0.5" cy="0.42" r="0.6">
          <stop offset="0" stopColor="#FFF4D6" />
          <stop offset="0.55" stopColor="#FCD27E" />
          <stop offset="1" stopColor="#F2A042" />
        </radialGradient>
        <linearGradient id="escena-bruma" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#F9C46B" stopOpacity="0" />
          <stop offset="0.5" stopColor="#F9C46B" stopOpacity="0.28" />
          <stop offset="1" stopColor="#F2A042" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Cielo */}
      <rect width="1440" height="900" fill="url(#escena-cielo)" />

      {/* Estrellas que se apagan con el amanecer */}
      <g fill="#FFF4D6">
        {ESTRELLAS.map(([x, y, r, retraso]) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r={r} className="escena-estrella" style={{ animationDelay: `${retraso}s` }} />
        ))}
      </g>

      {/* Sol y su halo */}
      <g className="escena-sol">
        <circle cx="980" cy="650" r="520" fill="url(#escena-halo)" />
        <circle cx="980" cy="650" r="150" fill="url(#escena-sol)" />
      </g>

      {/* Colinas lejanas con la plantación al fondo */}
      <path
        d="M0 640C160 600 300 610 430 628S700 600 860 612 1180 590 1440 620V900H0Z"
        fill="#5b5a33"
        opacity="0.75"
      />
      <Hilera y={636} desde={-20} hasta={1460} paso={46} escala={0.2} color="#4c5130" alto={150} />

      {/* Bruma del horizonte */}
      <rect x="0" y="560" width="1440" height="170" fill="url(#escena-bruma)" />

      {/* Colinas medias con hilera de palmas */}
      <path d="M0 700C220 666 420 690 640 684S1040 660 1440 690V900H0Z" fill="#26402a" />
      <Hilera y={700} desde={-30} hasta={1480} paso={88} escala={0.42} color="#1f3624" alto={170} />

      {/* Suelo cercano */}
      <path d="M0 790C260 762 520 780 760 774S1200 756 1440 778V900H0Z" fill="#12261a" />
      <Hilera y={792} desde={40} hasta={1440} paso={190} escala={0.74} color="#0f2016" alto={190} />

      {/* Primer plano: palmas grandes en los bordes */}
      <Palma x={70} y={930} escala={1.9} alto={270} color="#08140c" retraso={-2} inclinacion={4} />
      <Palma x={1385} y={940} escala={2.1} alto={280} color="#08140c" retraso={-4.5} inclinacion={-5} />
      <path d="M0 860C300 846 640 858 900 852S1300 840 1440 850V900H0Z" fill="#08140c" />
    </svg>
  );
}
