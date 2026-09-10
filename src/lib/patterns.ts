import { fromAscii, type Matrix } from "./cnn";

export const GRID_SIZE = 10;

export type PatternPreset = {
  id: string;
  name: string;
  ascii: string[];
  /**
   * `false` para formas que não pertencem a nenhuma das classes de saída.
   * Servem para explorar a convolução e para mostrar como a rede se comporta
   * diante de algo que nunca viu no treino.
   */
  trained?: boolean;
};

/**
 * Padrões desenhados em arte ASCII 10x10 (`#` = pixel aceso, `.` = apagado).
 * Os três primeiros também servem de "gabarito" para a camada de classificação.
 */
export const PATTERN_PRESETS: PatternPreset[] = [
  {
    id: "x",
    name: "Letra X",
    trained: true,
    ascii: [
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
  },
  {
    id: "circle",
    name: "Círculo",
    trained: true,
    ascii: [
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
  },
  {
    id: "diagonal",
    name: "Linha Diagonal",
    trained: true,
    ascii: [
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
  },
  {
    id: "vertical",
    name: "Linha Vertical",
    trained: true,
    ascii: [
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
  },
  {
    id: "square",
    name: "Quadrado",
    trained: false,
    ascii: [
      "..........",
      ".########.",
      ".#......#.",
      ".#......#.",
      ".#......#.",
      ".#......#.",
      ".#......#.",
      ".#......#.",
      ".########.",
      "..........",
    ],
  },
  {
    id: "cross",
    name: "Cruz",
    trained: false,
    ascii: [
      "....##....",
      "....##....",
      "....##....",
      "....##....",
      "##########",
      "##########",
      "....##....",
      "....##....",
      "....##....",
      "....##....",
    ],
  },
];

export function getPattern(id: string): Matrix {
  const preset = PATTERN_PRESETS.find((p) => p.id === id);
  return preset ? fromAscii(preset.ascii) : blankPattern();
}

export function blankPattern(): Matrix {
  return Array.from({ length: GRID_SIZE }, () =>
    Array.from({ length: GRID_SIZE }, () => 0)
  );
}

/**
 * As classes que a camada totalmente conectada tenta distinguir. A ordem importa:
 * é a mesma de `CLASS_TEMPLATES`, em `training.ts`.
 */
export const CLASSES = [
  { id: "x", label: "É um X" },
  { id: "circle", label: "É um Círculo" },
  { id: "diagonal", label: "É uma Linha" },
] as const;

export type ClassId = (typeof CLASSES)[number]["id"];
