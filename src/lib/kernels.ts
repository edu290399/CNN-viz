import type { Matrix } from "./cnn";

export type KernelPreset = {
  id: string;
  name: string;
  /** Explicação curta de "o que este filtro procura". */
  description: string;
  weights: Matrix;
  /** Zero-padding em cada lado. `1` num kernel 3×3 preserva o tamanho da entrada. */
  padding?: number;
};

export const KERNEL_PRESETS: KernelPreset[] = [
  {
    id: "edge",
    name: "Detector de Bordas",
    description:
      "Laplaciano: soma zero. Regiões uniformes se anulam e só sobram as transições de intensidade.",
    weights: [
      [-1, -1, -1],
      [-1, 8, -1],
      [-1, -1, -1],
    ],
  },
  {
    id: "edge-pad",
    name: "Detector de Bordas + padding",
    description:
      "O mesmo Laplaciano, com uma moldura de zeros (padding = 1). O kernel também centra nos pixels da borda, então o contorno da figura não é cortado — a saída fica do mesmo tamanho da entrada.",
    padding: 1,
    weights: [
      [-1, -1, -1],
      [-1, 8, -1],
      [-1, -1, -1],
    ],
  },
  {
    id: "sobel-x",
    name: "Borda Vertical (Sobel X)",
    description:
      "Compara a coluna da esquerda com a da direita. Responde forte em traços verticais.",
    weights: [
      [-1, 0, 1],
      [-2, 0, 2],
      [-1, 0, 1],
    ],
  },
  {
    id: "sobel-y",
    name: "Borda Horizontal (Sobel Y)",
    description:
      "Compara a linha de cima com a de baixo. Responde forte em traços horizontais.",
    weights: [
      [-1, -2, -1],
      [0, 0, 0],
      [1, 2, 1],
    ],
  },
  {
    id: "sharpen",
    name: "Sharpen (Nitidez)",
    description:
      "Realça o pixel central e subtrai a vizinhança, aumentando o contraste local.",
    weights: [
      [0, -1, 0],
      [-1, 5, -1],
      [0, -1, 0],
    ],
  },
  {
    id: "blur",
    name: "Blur (Média 3x3)",
    description:
      "Média simples da vizinhança. Suaviza ruído, mas apaga detalhes finos.",
    weights: [
      [1 / 9, 1 / 9, 1 / 9],
      [1 / 9, 1 / 9, 1 / 9],
      [1 / 9, 1 / 9, 1 / 9],
    ],
  },
  {
    id: "identity",
    name: "Identidade",
    description:
      "Copia o pixel central. Útil como controle: a saída é igual à entrada (recortada nas bordas).",
    weights: [
      [0, 0, 0],
      [0, 1, 0],
      [0, 0, 0],
    ],
  },
  {
    id: "emboss",
    name: "Emboss (Relevo)",
    description:
      "Kernel assimétrico na diagonal: cria a ilusão de profundidade destacando um lado das bordas.",
    weights: [
      [-2, -1, 0],
      [-1, 1, 1],
      [0, 1, 2],
    ],
  },
];

export const DEFAULT_KERNEL_ID = "edge";

export function getKernelPreset(id: string): KernelPreset | undefined {
  return KERNEL_PRESETS.find((k) => k.id === id);
}

/** Descobre se pesos + padding correspondem a algum preset (tolerância p/ float). */
export function matchPreset(weights: Matrix, padding = 0): KernelPreset | undefined {
  return KERNEL_PRESETS.find(
    (preset) =>
      (preset.padding ?? 0) === padding &&
      preset.weights.every((row, r) =>
        row.every((v, c) => Math.abs(v - weights[r][c]) < 1e-6)
      )
  );
}
