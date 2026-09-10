import { fromAscii, type Matrix } from "./cnn";
import { GRID_SIZE } from "./patterns";

/**
 * Conjunto de treino da camada densa.
 *
 * Cada classe tem vários gabaritos (espessuras e tamanhos diferentes) e cada
 * gabarito é replicado com pequenas translações. Sem essa variedade a camada
 * densa decora um exemplo único e erra qualquer desenho ligeiramente diferente
 * — exatamente o problema que a "data augmentation" resolve numa rede real.
 */

const X_TEMPLATES: string[][] = [
  [
    "..........",
    ".#......#.",
    "..#....#..",
    "...#..#...",
    "....##....",
    "....##....",
    "...#..#...",
    "..#....#..",
    ".#......#.",
    "..........",
  ],
  [
    "#........#",
    ".#......#.",
    "..#....#..",
    "...#..#...",
    "....##....",
    "....##....",
    "...#..#...",
    "..#....#..",
    ".#......#.",
    "#........#",
  ],
  [
    "..........",
    "..........",
    "..#....#..",
    "...#..#...",
    "....##....",
    "....##....",
    "...#..#...",
    "..#....#..",
    "..........",
    "..........",
  ],
  [
    "..........",
    "..........",
    "..........",
    "...#..#...",
    "....##....",
    "....##....",
    "...#..#...",
    "..........",
    "..........",
    "..........",
  ],
];

const CIRCLE_TEMPLATES: string[][] = [
  [
    "...####...",
    "..#....#..",
    ".#......#.",
    "#........#",
    "#........#",
    "#........#",
    "#........#",
    ".#......#.",
    "..#....#..",
    "...####...",
  ],
  [
    "..........",
    "...####...",
    "..#....#..",
    ".#......#.",
    ".#......#.",
    ".#......#.",
    ".#......#.",
    "..#....#..",
    "...####...",
    "..........",
  ],
  [
    "..........",
    "..........",
    "...###....",
    "..#...#...",
    ".#.....#..",
    ".#.....#..",
    "..#...#...",
    "...###....",
    "..........",
    "..........",
  ],
  [
    "..........",
    "..........",
    "..........",
    "...##.....",
    "..#..#....",
    "..#..#....",
    "...##.....",
    "..........",
    "..........",
    "..........",
  ],
];

const LINE_TEMPLATES: string[][] = [
  // diagonal "\"
  [
    "#.........",
    ".#........",
    "..#.......",
    "...#......",
    "....#.....",
    ".....#....",
    "......#...",
    ".......#..",
    "........#.",
    ".........#",
  ],
  // diagonal "/"
  [
    ".........#",
    "........#.",
    ".......#..",
    "......#...",
    ".....#....",
    "....#.....",
    "...#......",
    "..#.......",
    ".#........",
    "#.........",
  ],
  // vertical grossa
  [
    "....##....",
    "....##....",
    "....##....",
    "....##....",
    "....##....",
    "....##....",
    "....##....",
    "....##....",
    "....##....",
    "....##....",
  ],
  // vertical fina
  [
    "....#.....",
    "....#.....",
    "....#.....",
    "....#.....",
    "....#.....",
    "....#.....",
    "....#.....",
    "....#.....",
    "....#.....",
    "....#.....",
  ],
  // horizontal grossa
  [
    "..........",
    "..........",
    "..........",
    "..........",
    "##########",
    "##########",
    "..........",
    "..........",
    "..........",
    "..........",
  ],
  // horizontal fina
  [
    "..........",
    "..........",
    "..........",
    "..........",
    "##########",
    "..........",
    "..........",
    "..........",
    "..........",
    "..........",
  ],
  // diagonal deslocada (mais curta)
  [
    "..........",
    "..#.......",
    "...#......",
    "....#.....",
    ".....#....",
    "......#...",
    ".......#..",
    "........#.",
    "..........",
    "..........",
  ],
  // diagonal "/" mais curta
  [
    "..........",
    ".......#..",
    "......#...",
    ".....#....",
    "....#.....",
    "...#......",
    "..#.......",
    ".#........",
    "..........",
    "..........",
  ],
  // segmentos curtos: uma linha não precisa atravessar a imagem toda
  [
    "..........",
    "..........",
    "..........",
    "...#......",
    "....#.....",
    ".....#....",
    "......#...",
    "..........",
    "..........",
    "..........",
  ],
  [
    "..........",
    "..........",
    "..........",
    "......#...",
    ".....#....",
    "....#.....",
    "...#......",
    "..........",
    "..........",
    "..........",
  ],
  [
    "..........",
    "..........",
    "....#.....",
    "....#.....",
    "....#.....",
    "....#.....",
    "....#.....",
    "..........",
    "..........",
    "..........",
  ],
  [
    "..........",
    "..........",
    "..........",
    "..........",
    "..####....",
    "..........",
    "..........",
    "..........",
    "..........",
    "..........",
  ],
];

/** Gabaritos por classe, na mesma ordem de `CLASSES`. */
export const CLASS_TEMPLATES: string[][][] = [
  X_TEMPLATES,
  CIRCLE_TEMPLATES,
  LINE_TEMPLATES,
];

/** Translada a matriz, descartando o que sai do quadro. */
export function shiftMatrix(m: Matrix, dRow: number, dCol: number): Matrix {
  const size = GRID_SIZE;
  const out: Matrix = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => 0)
  );
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const sr = r - dRow;
      const sc = c - dCol;
      if (sr >= 0 && sr < size && sc >= 0 && sc < size) out[r][c] = m[sr][sc];
    }
  }
  return out;
}

/** Engrossa o traço: todo pixel aceso contamina os vizinhos à direita e abaixo. */
export function dilateMatrix(m: Matrix): Matrix {
  const size = GRID_SIZE;
  const out: Matrix = m.map((row) => [...row]);
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (m[r][c] <= 0) continue;
      if (r + 1 < size) out[r + 1][c] = Math.max(out[r + 1][c], m[r][c]);
      if (c + 1 < size) out[r][c + 1] = Math.max(out[r][c + 1], m[r][c]);
    }
  }
  return out;
}

/**
 * Abre falhas no traço, de forma determinística: apaga 1 de cada `every` pixels
 * acesos. Simula o desenho trêmulo de quem está usando o mouse.
 */
export function punctureMatrix(m: Matrix, every: number, offset: number): Matrix {
  const out: Matrix = m.map((row) => [...row]);
  let seen = 0;
  for (let r = 0; r < out.length; r++) {
    for (let c = 0; c < out[r].length; c++) {
      if (out[r][c] <= 0) continue;
      if ((seen + offset) % every === 0) out[r][c] = 0;
      seen++;
    }
  }
  return out;
}

/** Deslocamentos até 2 pixels, evitando os cantos mais extremos. */
const SHIFTS: Array<[number, number]> = (() => {
  const list: Array<[number, number]> = [];
  for (let dRow = -2; dRow <= 2; dRow++) {
    for (let dCol = -2; dCol <= 2; dCol++) {
      if (Math.abs(dRow) + Math.abs(dCol) <= 3) list.push([dRow, dCol]);
    }
  }
  return list;
})();

/**
 * Todas as imagens de treino de uma classe: cada gabarito passa por variações de
 * espessura e de continuidade do traço, e cada variação por todos os
 * deslocamentos. É o que garante que a rede reconheça a forma desenhada torto,
 * grossa ou fora do centro.
 */
export function classSamples(classIndex: number): Matrix[] {
  const templates = CLASS_TEMPLATES[classIndex] ?? [];
  const samples: Matrix[] = [];

  for (const ascii of templates) {
    const base = fromAscii(ascii);
    // Uma dilatação só. Dilatar duas vezes transforma as formas em manchas
    // ambíguas e, medido, piorava tanto o treino quanto a generalização.
    const thick = dilateMatrix(base);
    const variants: Matrix[] = [
      base,
      thick,
      punctureMatrix(base, 4, 0),
      punctureMatrix(thick, 5, 2),
    ];

    for (const variant of variants) {
      for (const [dRow, dCol] of SHIFTS) {
        samples.push(shiftMatrix(variant, dRow, dCol));
      }
    }
  }

  return samples;
}
