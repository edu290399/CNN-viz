import { fromAscii, type Matrix } from "./cnn";

export const GRID_SIZE = 10;

export type PatternPreset = {
  id: string;
  name: string;
  ascii: string[];
};

/**
 * Padrões desenhados em arte ASCII 10x10 (`#` = pixel aceso, `.` = apagado).
 * Os três primeiros também servem de "gabarito" para a camada de classificação.
 */
export const PATTERN_PRESETS: PatternPreset[] = [
  {
    id: "x",
    name: "Letra X",
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

/** As classes que a camada totalmente conectada tenta distinguir. */
export const CLASSES = [
  { id: "x", label: "É um X", patternId: "x" },
  { id: "circle", label: "É um Círculo", patternId: "circle" },
  { id: "diagonal", label: "É uma Linha", patternId: "diagonal" },
] as const;

export type ClassId = (typeof CLASSES)[number]["id"];
