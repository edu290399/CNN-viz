import { convolveFast, maxPoolFast, relu, softmax, type Matrix } from "./cnn";
import { CLASSES } from "./patterns";
import { classSamples } from "./training";

/**
 * O "cabeçalho" de classificação da rede, treinado de verdade no navegador:
 * flatten(16) -> camada oculta ReLU -> camada de saída softmax, ajustadas por
 * retropropagação com Adam sobre os exemplos de `training.ts`.
 *
 * A camada oculta não é enfeite. Depois da normalização, um X é praticamente o
 * ponto médio entre uma diagonal "\" e uma "/" — e nenhum classificador linear
 * consegue separar o ponto médio de dois exemplos da *mesma* classe. Medido:
 * só com a camada de saída, o modelo não passava de ~70% de acerto nem no
 * conjunto de treino. Arquiteturas reais (LeNet, VGG) empilham camadas densas
 * pelo mesmo motivo.
 *
 * O que continua simulado é o kernel: numa CNN real ele também seria aprendido,
 * e haveria dezenas de filtros em paralelo. Aqui você escolhe o filtro e a rede
 * aprende a tirar o melhor proveito dele — por isso a qualidade da predição
 * muda quando você troca o kernel.
 */

export const HIDDEN_UNITS = 14;

export type TrainingOptions = {
  /** Número de passos de gradiente (cada passo usa um mini-lote). */
  iterations: number;
  batchSize: number;
  learningRate: number;
  l2: number;
  hiddenUnits: number;
  seed: number;
};

export const DEFAULT_TRAINING: TrainingOptions = {
  iterations: 1200,
  batchSize: 64,
  learningRate: 0.05,
  l2: 1e-4,
  hiddenUnits: HIDDEN_UNITS,
  seed: 1337,
};

export type LayerParams = {
  /** `weights[unidadeDeSaida][unidadeDeEntrada]`. */
  weights: number[][];
  biases: number[];
};

export type DenseModel = {
  hidden: LayerParams;
  output: LayerParams;
  /** Entropia cruzada final — quanto menor, melhor o filtro separa as classes. */
  loss: number;
  /** Acurácia no próprio conjunto de treino. */
  trainAccuracy: number;
};

/**
 * Normaliza pelo maior valor absoluto do mapa.
 *
 * Deixa a predição imune à intensidade do pincel (desenhar com 0,5 dá o mesmo
 * resultado que com 1,0) e — diferente de uma normalização L2 — preserva
 * *quantas* regiões foram ativadas, informação essencial para distinguir "duas
 * diagonais acesas" (X) de "uma diagonal acesa" (linha).
 */
export function extractFeatures(pooled: Matrix): number[] {
  const flat = pooled.flat();
  let max = 0;
  for (const v of flat) max = Math.max(max, Math.abs(v));
  return max < 1e-9 ? flat.map(() => 0) : flat.map((v) => v / max);
}

/** Roda conv -> ReLU -> pool e devolve o vetor de características normalizado. */
export function featuresFor(input: Matrix, kernel: Matrix): number[] {
  const pooled = maxPoolFast(relu(convolveFast(input, kernel)), 2, 2);
  return extractFeatures(pooled);
}

// ---------------------------------------------------------------------------
// Treinamento
// ---------------------------------------------------------------------------

/** PRNG determinístico: mesma inicialização a cada execução, sem surpresas. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Dataset = {
  features: number[][];
  labels: number[];
  /** Peso por amostra, para que classes com mais gabaritos não dominem. */
  sampleWeights: number[];
};

function buildDataset(kernel: Matrix): Dataset {
  const features: number[][] = [];
  const labels: number[] = [];
  const perClassCount: number[] = [];

  CLASSES.forEach((_, classIndex) => {
    const samples = classSamples(classIndex);
    perClassCount[classIndex] = samples.length;
    for (const sample of samples) {
      features.push(featuresFor(sample, kernel));
      labels.push(classIndex);
    }
  });

  // Peso médio 1, mas classes com mais gabaritos pesam menos por amostra.
  const total = labels.length;
  const sampleWeights = labels.map(
    (label) => total / (perClassCount[label] * CLASSES.length)
  );

  return { features, labels, sampleWeights };
}

/** Estado do Adam para um tensor de parâmetros. */
type AdamSlot = { m: number[][]; v: number[][]; mb: number[]; vb: number[] };

function zerosLike(rows: number, cols: number): number[][] {
  return Array.from({ length: rows }, () => Array.from({ length: cols }, () => 0));
}

export function trainDenseLayer(
  kernel: Matrix,
  options: TrainingOptions = DEFAULT_TRAINING
): DenseModel {
  const { features, labels, sampleWeights } = buildDataset(kernel);
  const numClasses = CLASSES.length;
  const dim = features[0]?.length ?? 0;
  const hiddenSize = options.hiddenUnits;

  const random = mulberry32(options.seed);
  // He uniforme: variância 2/fanIn, que mantém o sinal estável ao passar pelo ReLU.
  const limitHidden = Math.sqrt(6 / Math.max(dim, 1));
  const limitOutput = Math.sqrt(6 / Math.max(hiddenSize, 1));

  const hidden: LayerParams = {
    weights: Array.from({ length: hiddenSize }, () =>
      Array.from({ length: dim }, () => (random() * 2 - 1) * limitHidden)
    ),
    // Bias levemente positivo: reduz o risco de a unidade nascer "morta",
    // sempre no lado zerado do ReLU e sem gradiente para se recuperar.
    biases: Array.from({ length: hiddenSize }, () => 0.01),
  };
  const output: LayerParams = {
    weights: Array.from({ length: numClasses }, () =>
      Array.from({ length: hiddenSize }, () => (random() * 2 - 1) * limitOutput)
    ),
    biases: Array.from({ length: numClasses }, () => 0),
  };

  const slotHidden: AdamSlot = {
    m: zerosLike(hiddenSize, dim),
    v: zerosLike(hiddenSize, dim),
    mb: new Array(hiddenSize).fill(0),
    vb: new Array(hiddenSize).fill(0),
  };
  const slotOutput: AdamSlot = {
    m: zerosLike(numClasses, hiddenSize),
    v: zerosLike(numClasses, hiddenSize),
    mb: new Array(numClasses).fill(0),
    vb: new Array(numClasses).fill(0),
  };

  const beta1 = 0.9;
  const beta2 = 0.999;
  const epsilon = 1e-8;
  let loss = 0;

  const applyAdam = (
    params: LayerParams,
    grads: { weights: number[][]; biases: number[] },
    slot: AdamSlot,
    step: number,
    learningRate: number,
    l2: number
  ) => {
    const correction1 = 1 - Math.pow(beta1, step);
    const correction2 = 1 - Math.pow(beta2, step);

    for (let i = 0; i < params.weights.length; i++) {
      const row = params.weights[i];
      for (let j = 0; j < row.length; j++) {
        const grad = grads.weights[i][j] + l2 * row[j];
        slot.m[i][j] = beta1 * slot.m[i][j] + (1 - beta1) * grad;
        slot.v[i][j] = beta2 * slot.v[i][j] + (1 - beta2) * grad * grad;
        const mHat = slot.m[i][j] / correction1;
        const vHat = slot.v[i][j] / correction2;
        row[j] -= (learningRate * mHat) / (Math.sqrt(vHat) + epsilon);
      }

      const gradB = grads.biases[i];
      slot.mb[i] = beta1 * slot.mb[i] + (1 - beta1) * gradB;
      slot.vb[i] = beta2 * slot.vb[i] + (1 - beta2) * gradB * gradB;
      const mHatB = slot.mb[i] / correction1;
      const vHatB = slot.vb[i] / correction2;
      params.biases[i] -= (learningRate * mHatB) / (Math.sqrt(vHatB) + epsilon);
    }
  };

  // Mini-lotes: com a augmentation completa são mais de mil amostras, e passar
  // por todas em cada passo deixaria a interface travada ao editar o kernel.
  const order = features.map((_, i) => i);
  const batchSize = Math.min(options.batchSize, order.length);
  let cursor = order.length; // força um embaralhamento no primeiro passo

  const shuffle = () => {
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
  };

  for (let iter = 1; iter <= options.iterations; iter++) {
    if (cursor + batchSize > order.length) {
      shuffle();
      cursor = 0;
    }
    const batch = order.slice(cursor, cursor + batchSize);
    cursor += batchSize;

    const gradHidden = {
      weights: zerosLike(hiddenSize, dim),
      biases: new Array(hiddenSize).fill(0) as number[],
    };
    const gradOutput = {
      weights: zerosLike(numClasses, hiddenSize),
      biases: new Array(numClasses).fill(0) as number[],
    };

    for (const i of batch) {
      const x = features[i];
      const weight = sampleWeights[i] / batchSize;

      // ---- forward
      const preActivation = new Array<number>(hiddenSize);
      const activation = new Array<number>(hiddenSize);
      for (let h = 0; h < hiddenSize; h++) {
        let sum = hidden.biases[h];
        const row = hidden.weights[h];
        for (let d = 0; d < dim; d++) sum += row[d] * x[d];
        preActivation[h] = sum;
        activation[h] = Math.max(0, sum);
      }

      const logits = new Array<number>(numClasses);
      for (let c = 0; c < numClasses; c++) {
        let sum = output.biases[c];
        const row = output.weights[c];
        for (let h = 0; h < hiddenSize; h++) sum += row[h] * activation[h];
        logits[c] = sum;
      }

      const probabilities = softmax(logits);

      // ---- backward
      const dLogits = new Array<number>(numClasses);
      for (let c = 0; c < numClasses; c++) {
        dLogits[c] = weight * (probabilities[c] - (labels[i] === c ? 1 : 0));
      }

      const dActivation = new Array<number>(hiddenSize).fill(0);
      for (let c = 0; c < numClasses; c++) {
        const delta = dLogits[c];
        if (delta === 0) continue;
        gradOutput.biases[c] += delta;
        const row = output.weights[c];
        const gradRow = gradOutput.weights[c];
        for (let h = 0; h < hiddenSize; h++) {
          gradRow[h] += delta * activation[h];
          dActivation[h] += delta * row[h];
        }
      }

      for (let h = 0; h < hiddenSize; h++) {
        if (preActivation[h] <= 0) continue; // derivada do ReLU é 0 aqui
        const delta = dActivation[h];
        if (delta === 0) continue;
        gradHidden.biases[h] += delta;
        const gradRow = gradHidden.weights[h];
        for (let d = 0; d < dim; d++) gradRow[d] += delta * x[d];
      }
    }

    applyAdam(output, gradOutput, slotOutput, iter, options.learningRate, options.l2);
    applyAdam(hidden, gradHidden, slotHidden, iter, options.learningRate, options.l2);
  }

  const model: DenseModel = { hidden, output, loss: 0, trainAccuracy: 0 };

  // Uma passada final sobre todo o conjunto, para relatar loss e acurácia reais.
  let correct = 0;
  let weightSum = 0;
  for (let i = 0; i < features.length; i++) {
    const prediction = predictFromFeatures(features[i], model);
    if (prediction.winnerIndex === labels[i]) correct++;
    loss -=
      sampleWeights[i] * Math.log(Math.max(prediction.probabilities[labels[i]], 1e-12));
    weightSum += sampleWeights[i];
  }

  model.loss = weightSum === 0 ? 0 : loss / weightSum;
  model.trainAccuracy = features.length === 0 ? 0 : correct / features.length;

  return model;
}

// ---------------------------------------------------------------------------
// Inferência
// ---------------------------------------------------------------------------

export type Prediction = {
  features: number[];
  /** Ativações da camada oculta, para a visualização. */
  hiddenActivations: number[];
  scores: number[];
  probabilities: number[];
  winnerIndex: number;
};

function predictFromFeatures(features: number[], model: DenseModel): Prediction {
  const hiddenActivations = model.hidden.weights.map((row, h) => {
    let sum = model.hidden.biases[h];
    for (let d = 0; d < row.length; d++) sum += row[d] * (features[d] ?? 0);
    return Math.max(0, sum);
  });

  const scores = model.output.weights.map((row, c) => {
    let sum = model.output.biases[c];
    for (let h = 0; h < row.length; h++) sum += row[h] * hiddenActivations[h];
    return sum;
  });

  const probabilities = softmax(scores);

  let winnerIndex = 0;
  probabilities.forEach((p, i) => {
    if (p > probabilities[winnerIndex]) winnerIndex = i;
  });

  return { features, hiddenActivations, scores, probabilities, winnerIndex };
}

export function classify(pooled: Matrix, model: DenseModel): Prediction {
  return predictFromFeatures(extractFeatures(pooled), model);
}

/**
 * Influência efetiva de cada elemento do vetor no score de uma classe.
 *
 * Com uma camada oculta no meio, não existe mais "o peso" que liga a entrada à
 * saída: o caminho passa por várias unidades. Somando as duas etapas ao longo de
 * todas as unidades que estão ativas (o ReLU bloqueia as demais), obtemos quanto
 * o score mudaria se aquele elemento aumentasse — que é a derivada do score.
 */
export function inputInfluence(
  model: DenseModel,
  features: number[],
  classIndex: number
): number[] {
  const dim = model.hidden.weights[0]?.length ?? 0;
  const influence = new Array<number>(dim).fill(0);

  model.hidden.weights.forEach((row, h) => {
    let sum = model.hidden.biases[h];
    for (let d = 0; d < dim; d++) sum += row[d] * (features[d] ?? 0);
    if (sum <= 0) return; // unidade desligada: não propaga nada

    const outWeight = model.output.weights[classIndex]?.[h] ?? 0;
    for (let d = 0; d < dim; d++) influence[d] += outWeight * row[d];
  });

  return influence;
}
