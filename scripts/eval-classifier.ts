/**
 * Harness de avaliação do classificador (uso: npx tsx scripts/eval-classifier.ts).
 * Não faz parte da aplicação — serve para medir a acurácia ao mexer no modelo.
 */

import {
  classify,
  DEFAULT_TRAINING,
  trainDenseLayer,
  type DenseModel,
} from "../src/lib/classifier";
import { convolve2d, fromAscii, maxPool2d, relu, type Matrix } from "../src/lib/cnn";
import { KERNEL_PRESETS } from "../src/lib/kernels";
import { CLASSES, getPattern, PATTERN_PRESETS } from "../src/lib/patterns";
import { classSamples, shiftMatrix } from "../src/lib/training";

function pooledOf(input: Matrix, kernel: Matrix): Matrix {
  const { output } = convolve2d(input, kernel);
  return maxPool2d(relu(output), 2, 2).output;
}

function predict(input: Matrix, kernel: Matrix, model: DenseModel) {
  const prediction = classify(pooledOf(input, kernel), model);
  return {
    label: CLASSES[prediction.winnerIndex].label,
    confidence: prediction.probabilities[prediction.winnerIndex],
  };
}

const labelOf = (id: string) => CLASSES.find((c) => c.id === id)?.label ?? "?";

/** Qual classe esperamos para cada padrão da barra de presets. */
const EXPECTED: Record<string, string | null> = {
  x: "x",
  circle: "circle",
  diagonal: "diagonal",
  vertical: "diagonal",
  square: null,
  cross: null,
};

/**
 * Casos que NÃO estão no conjunto de treino: desenhos imperfeitos, espessuras e
 * tamanhos diferentes. É aqui que se vê generalização de verdade.
 */
const HELD_OUT: Array<{ name: string; expect: string; ascii: string[] }> = [
  {
    name: "diagonal grossa",
    expect: "diagonal",
    ascii: [
      "##........",
      "##........",
      "..##......",
      "..##......",
      "....##....",
      "....##....",
      "......##..",
      "......##..",
      "........##",
      "........##",
    ],
  },
  {
    name: "diagonal quebrada",
    expect: "diagonal",
    ascii: [
      "#.........",
      ".#........",
      "..........",
      "...#......",
      "....#.....",
      ".....#....",
      "..........",
      ".......#..",
      "........#.",
      ".........#",
    ],
  },
  {
    name: "diagonal curta canto",
    expect: "diagonal",
    ascii: [
      "..........",
      "..........",
      "..........",
      "..........",
      "..........",
      ".....#....",
      "......#...",
      ".......#..",
      "........#.",
      ".........#",
    ],
  },
  {
    name: "linha vertical fina",
    expect: "diagonal",
    ascii: [
      "..#.......",
      "..#.......",
      "..#.......",
      "..#.......",
      "..#.......",
      "..#.......",
      "..#.......",
      "..#.......",
      "..#.......",
      "..#.......",
    ],
  },
  {
    name: "linha horizontal",
    expect: "diagonal",
    ascii: [
      "..........",
      "..........",
      "..........",
      "..........",
      "..........",
      "..........",
      "##########",
      "..........",
      "..........",
      "..........",
    ],
  },
  {
    name: "X torto",
    expect: "x",
    ascii: [
      "..........",
      ".#.......#",
      "..#.....#.",
      "...#...#..",
      "....#.#...",
      "....##....",
      "...#..#...",
      "..#....#..",
      ".#......#.",
      "#.........",
    ],
  },
  {
    name: "X grosso",
    expect: "x",
    ascii: [
      "##......##",
      "##......##",
      "..##..##..",
      "..##..##..",
      "....##....",
      "....##....",
      "..##..##..",
      "..##..##..",
      "##......##",
      "##......##",
    ],
  },
  {
    name: "circulo irregular",
    expect: "circle",
    ascii: [
      "...###....",
      "..#...##..",
      ".#......#.",
      "#........#",
      "#........#",
      ".#.......#",
      ".#......#.",
      "..#....#..",
      "...####...",
      "..........",
    ],
  },
  {
    name: "circulo achatado",
    expect: "circle",
    ascii: [
      "..........",
      "..........",
      "..####....",
      ".#....#...",
      "#......#..",
      "#......#..",
      ".#....#...",
      "..####....",
      "..........",
      "..........",
    ],
  },
];

const pad = (s: string, n: number) => s.padEnd(n).slice(0, n);

function evaluate(
  iterations: number,
  verbose: boolean,
  overrides: Partial<typeof DEFAULT_TRAINING> = {}
) {
  const options = { ...DEFAULT_TRAINING, iterations, ...overrides };
  let totalHits = 0;
  let totalScored = 0;
  let heldHits = 0;
  let heldScored = 0;
  let worstTrainAccuracy = 1;
  let totalMs = 0;

  for (const kernelPreset of KERNEL_PRESETS) {
    const started = Date.now();
    const model = trainDenseLayer(kernelPreset.weights, options);
    totalMs += Date.now() - started;
    worstTrainAccuracy = Math.min(worstTrainAccuracy, model.trainAccuracy);

    if (verbose) {
      console.log(
        `\n=== ${kernelPreset.name} — acurácia treino ${(
          model.trainAccuracy * 100
        ).toFixed(1)}%, loss ${model.loss.toFixed(4)}`
      );
    }

    // presets da barra lateral, com deslocamentos de 1 e 2 pixels
    for (const preset of PATTERN_PRESETS) {
      const expected = EXPECTED[preset.id];
      const base = getPattern(preset.id);
      const result = predict(base, kernelPreset.weights, model);

      if (!expected) {
        if (verbose) {
          console.log(
            `  ${pad(preset.name, 20)} -> ${pad(result.label, 15)} ${(
              result.confidence * 100
            )
              .toFixed(1)
              .padStart(5)}%  (fora do treino)`
          );
        }
        continue;
      }

      const expectedLabel = labelOf(expected);
      const shifts: Array<[number, number]> = [
        [0, 0],
        [-1, 0],
        [1, 0],
        [0, -1],
        [0, 1],
        [-2, 0],
        [2, 0],
        [0, -2],
        [0, 2],
      ];
      const hits = shifts.filter(
        ([dr, dc]) =>
          predict(shiftMatrix(base, dr, dc), kernelPreset.weights, model).label ===
          expectedLabel
      ).length;

      totalScored += shifts.length;
      totalHits += hits;

      if (verbose) {
        console.log(
          `  ${pad(preset.name, 20)} -> ${pad(result.label, 15)} ${(
            result.confidence * 100
          )
            .toFixed(1)
            .padStart(5)}%  ${
            result.label === expectedLabel ? "OK  " : "ERRO"
          } deslocamentos ${hits}/${shifts.length}`
        );
      }
    }

    // casos fora do conjunto de treino
    for (const testCase of HELD_OUT) {
      const expectedLabel = labelOf(testCase.expect);
      const result = predict(fromAscii(testCase.ascii), kernelPreset.weights, model);
      const ok = result.label === expectedLabel;
      heldScored++;
      if (ok) heldHits++;
      if (verbose) {
        console.log(
          `  ${pad("· " + testCase.name, 20)} -> ${pad(result.label, 15)} ${(
            result.confidence * 100
          )
            .toFixed(1)
            .padStart(5)}%  ${ok ? "OK" : "ERRO (esperado " + expectedLabel + ")"}`
        );
      }
    }
  }

  return {
    iterations,
    ms: totalMs / KERNEL_PRESETS.length,
    worstTrainAccuracy,
    presetAccuracy: totalHits / Math.max(totalScored, 1),
    heldOutAccuracy: heldHits / Math.max(heldScored, 1),
  };
}

/** Diagnóstico de unidades ocultas mortas (que nunca disparam para nada). */
function diagnoseHiddenUnits() {
  console.log(
    "         kernel          | unidades vivas | ativas/amostra | ativas nos presets"
  );
  for (const kernelPreset of KERNEL_PRESETS) {
    const model = trainDenseLayer(kernelPreset.weights);
    const hiddenCount = model.hidden.weights.length;

    const everActive = new Array<boolean>(hiddenCount).fill(false);
    let activeSum = 0;
    let samples = 0;

    for (let classIndex = 0; classIndex < CLASSES.length; classIndex++) {
      for (const sample of classSamples(classIndex)) {
        const prediction = classify(pooledOf(sample, kernelPreset.weights), model);
        prediction.hiddenActivations.forEach((a, h) => {
          if (a > 0) everActive[h] = true;
        });
        activeSum += prediction.hiddenActivations.filter((a) => a > 0).length;
        samples++;
      }
    }

    const presetActive = PATTERN_PRESETS.map((preset) => {
      const prediction = classify(
        pooledOf(getPattern(preset.id), kernelPreset.weights),
        model
      );
      return prediction.hiddenActivations.filter((a) => a > 0).length;
    });

    console.log(
      `${pad(kernelPreset.name, 24)} | ${String(
        everActive.filter(Boolean).length
      ).padStart(9)}/${hiddenCount} | ${(activeSum / Math.max(samples, 1))
        .toFixed(1)
        .padStart(14)} | ${presetActive.join(", ")}`
    );
  }
}

const mode = process.argv[2] ?? "sweep";

const report = (tag: string, r: ReturnType<typeof evaluate>) =>
  console.log(
    `${tag.padStart(12)} | ${(r.worstTrainAccuracy * 100)
      .toFixed(1)
      .padStart(10)}% | ${(r.presetAccuracy * 100).toFixed(1).padStart(12)}% | ${(
      r.heldOutAccuracy * 100
    )
      .toFixed(1)
      .padStart(13)}% | ${r.ms.toFixed(0).padStart(9)}`
  );

if (mode === "units") {
  diagnoseHiddenUnits();
} else if (mode === "sweep") {
  console.log("   config    | treino(min) | presets+shift | fora do treino | ms/kernel");
  for (const iterations of [1200, 2000, 3000, 4500]) {
    report(`iters ${iterations}`, evaluate(iterations, false));
  }
} else if (mode === "hidden") {
  console.log("   config    | treino(min) | presets+shift | fora do treino | ms/kernel");
  for (const hiddenUnits of [6, 8, 10, 14, 20, 28]) {
    // mais unidades = mais parâmetros por passo, então damos mais passos também
    report(`h=${hiddenUnits}`, evaluate(1200, false, { hiddenUnits }));
  }
} else if (mode === "seeds") {
  // confirma que o resultado não depende da sorte da inicialização
  console.log("   config    | treino(min) | presets+shift | fora do treino | ms/kernel");
  for (const seed of [1337, 7, 42, 2024, 99991]) {
    report(`seed ${seed}`, evaluate(DEFAULT_TRAINING.iterations, false, { seed }));
  }
} else {
  const r = evaluate(DEFAULT_TRAINING.iterations, true);
  console.log(
    `\n>>> presets+deslocamentos ${(r.presetAccuracy * 100).toFixed(1)}% | fora do treino ${(
      r.heldOutAccuracy * 100
    ).toFixed(1)}% | treino(min) ${(r.worstTrainAccuracy * 100).toFixed(1)}%`
  );
}
