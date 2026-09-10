"use client";

import { Filter, Image as ImageIcon, Minimize2, Network, Zap } from "lucide-react";
import { useCallback, useState } from "react";
import Sidebar, { type NavSection } from "@/components/Sidebar";
import ConvolutionLayer from "@/components/layers/ConvolutionLayer";
import FlattenLayer from "@/components/layers/FlattenLayer";
import InputLayer from "@/components/layers/InputLayer";
import PoolingLayer from "@/components/layers/PoolingLayer";
import ReluLayer from "@/components/layers/ReluLayer";
import SectionShell from "@/components/ui/SectionShell";
import { useCnnPipeline } from "@/hooks/useCnnPipeline";
import type { Matrix } from "@/lib/cnn";
import { PALETTE, type ValueScale } from "@/lib/colors";
import { DEFAULT_KERNEL_ID, getKernelPreset } from "@/lib/kernels";
import { blankPattern, CLASSES, getPattern } from "@/lib/patterns";

const SECTIONS: NavSection[] = [
  { id: "input", label: "Camada de Entrada", shape: "10 × 10 × 1", icon: ImageIcon, accent: PALETTE.input },
  { id: "conv", label: "Convolução", shape: "→ 8 × 8", icon: Filter, accent: PALETTE.kernel },
  { id: "relu", label: "Ativação ReLU", shape: "→ 8 × 8", icon: Zap, accent: PALETTE.positive },
  { id: "pool", label: "Max Pooling", shape: "→ 4 × 4", icon: Minimize2, accent: PALETTE.pool },
  { id: "dense", label: "Flatten + Densa", shape: "→ 16 → 14 → 3", icon: Network, accent: PALETTE.dense },
];

const PIPELINE_STEPS: Array<{ label: string; kind: "shape" | "op" }> = [
  { label: "10×10", kind: "shape" },
  { label: "conv 3×3", kind: "op" },
  { label: "8×8", kind: "shape" },
  { label: "ReLU", kind: "op" },
  { label: "8×8", kind: "shape" },
  { label: "pool 2×2", kind: "op" },
  { label: "4×4", kind: "shape" },
  { label: "flatten", kind: "op" },
  { label: "16", kind: "shape" },
  { label: "densa + ReLU", kind: "op" },
  { label: "14", kind: "shape" },
  { label: "densa + softmax", kind: "op" },
  { label: "3", kind: "shape" },
];

function cloneKernel(id: string): Matrix {
  const preset = getKernelPreset(id);
  return (preset?.weights ?? [[0, 0, 0], [0, 1, 0], [0, 0, 0]]).map((row) => [...row]);
}

export default function Home() {
  const [input, setInput] = useState<Matrix>(() => getPattern("x"));
  const [patternId, setPatternId] = useState<string | null>("x");
  const [kernel, setKernel] = useState<Matrix>(() => cloneKernel(DEFAULT_KERNEL_ID));
  const [valueScale, setValueScale] = useState<ValueScale>("unit");

  const pipeline = useCnnPipeline(input, kernel);

  const handlePaint = useCallback((row: number, col: number, value: number) => {
    setInput((prev) => {
      if (prev[row][col] === value) return prev;
      const next = prev.map((r) => [...r]);
      next[row][col] = value;
      return next;
    });
    setPatternId(null);
  }, []);

  const handleSelectPattern = useCallback((id: string) => {
    setInput(getPattern(id));
    setPatternId(id);
  }, []);

  const handleClear = useCallback(() => {
    setInput(blankPattern());
    setPatternId(null);
  }, []);

  const handleSelectPreset = useCallback((id: string) => {
    setKernel(cloneKernel(id));
  }, []);

  return (
    <div className="flex min-h-screen bg-slate-950">
      <Sidebar
        sections={SECTIONS}
        prediction={{
          label: CLASSES[pipeline.prediction.winnerIndex].label,
          confidence: pipeline.prediction.probabilities[pipeline.prediction.winnerIndex],
        }}
      />

      <main className="min-w-0 flex-1">
        <div className="mx-auto max-w-6xl px-6 py-10 lg:px-10">
          <header className="mb-12">
            <h1 className="text-3xl font-semibold tracking-tight text-slate-100 sm:text-4xl">
              O que acontece dentro de uma CNN
            </h1>
            <p className="mt-3 max-w-3xl text-slate-400">
              Desenhe uma imagem, escolha um filtro e acompanhe o mesmo dado atravessando cada
              camada da rede. Tudo é recalculado em tempo real: mude um único pixel e veja o efeito
              se propagar até a classificação final.
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-2 font-mono text-xs">
              {PIPELINE_STEPS.map((item, index) => (
                <span key={`${item.label}-${index}`} className="flex items-center gap-2">
                  <span
                    className={`rounded-md px-2 py-1 ${
                      item.kind === "shape"
                        ? "bg-slate-800/80 text-slate-300"
                        : "border border-slate-800 text-slate-500"
                    }`}
                  >
                    {item.label}
                  </span>
                  {index < PIPELINE_STEPS.length - 1 ? (
                    <span className="text-slate-700">›</span>
                  ) : null}
                </span>
              ))}
            </div>
          </header>

          <div className="flex flex-col gap-14">
            <SectionShell
              id="input"
              step={1}
              title="A imagem é só uma matriz de números"
              subtitle="Antes de qualquer coisa, é preciso aceitar: a rede nunca “vê” um desenho. Ela vê uma tabela de intensidades."
              accent={PALETTE.input}
              icon={ImageIcon}
              explanation={
                <div className="space-y-3">
                  <p>
                    Cada quadrado abaixo é um <strong className="text-slate-100">pixel</strong>. O
                    número dentro dele é a intensidade luminosa: <code>0</code> é preto absoluto e{" "}
                    <code>1</code> (ou <code>255</code>) é branco.
                  </p>
                  <p>
                    Esta imagem tem um único <strong className="text-slate-100">canal</strong> (tons
                    de cinza). Uma foto colorida seria a mesma coisa em triplicata — um plano para
                    vermelho, um para verde e um para azul — formando um tensor 10×10×3.
                  </p>
                  <p className="rounded-lg border border-sky-500/20 bg-sky-500/5 p-3 text-sky-100/80">
                    <strong>Experimente:</strong> clique e arraste sobre o grid para desenhar. Todas
                    as camadas seguintes reagem imediatamente à sua alteração.
                  </p>
                  <p className="text-xs text-slate-500">
                    Usamos 10×10 para caber na tela. Uma imagem real do MNIST tem 28×28 = 784
                    pixels, e uma foto de celular passa de 12 milhões.
                  </p>
                </div>
              }
            >
              <InputLayer
                matrix={input}
                patternId={patternId}
                onSelectPattern={handleSelectPattern}
                onPaint={handlePaint}
                onClear={handleClear}
                valueScale={valueScale}
                onToggleScale={() =>
                  setValueScale((prev) => (prev === "unit" ? "byte" : "unit"))
                }
              />
            </SectionShell>

            <SectionShell
              id="conv"
              step={2}
              title="Convolução: o filtro que varre a imagem"
              subtitle="Uma matriz 3×3 de pesos desliza sobre a imagem e resume cada vizinhança em um único número."
              accent={PALETTE.kernel}
              icon={Filter}
              explanation={
                <div className="space-y-3">
                  <p>
                    O <strong className="text-slate-100">kernel</strong> (ou filtro) é uma matriz
                    pequena de pesos. Em cada posição ele cobre um pedaço 3×3 da imagem — o{" "}
                    <em>campo receptivo</em>.
                  </p>
                  <p>A operação em cada parada tem só dois passos:</p>
                  <ol className="list-decimal space-y-1 pl-5 text-slate-400">
                    <li>multiplicar cada pixel pelo peso que está sobre ele;</li>
                    <li>somar os 9 produtos — isso vira um único pixel de saída.</li>
                  </ol>
                  <p>
                    Depois o kernel anda uma casa (<code>stride = 1</code>) e repete. Como ele não
                    ultrapassa as bordas, a saída encolhe:{" "}
                    <code className="text-orange-300">10 − 3 + 1 = 8</code>.
                  </p>
                  <p className="rounded-lg border border-orange-500/20 bg-orange-500/5 p-3 text-orange-100/80">
                    <strong>O ponto central:</strong> os mesmos 9 pesos são reutilizados na imagem
                    inteira. Isso é o <em>compartilhamento de pesos</em>, e é o que torna a CNN
                    barata comparada a uma rede densa — e capaz de achar o mesmo padrão em qualquer
                    posição.
                  </p>
                  <p className="text-xs text-slate-500">
                    Aqui você escolhe os pesos à mão. Numa rede real eles começam aleatórios e são
                    descobertos pelo treinamento — a rede aprende sozinha que detectar bordas é útil.
                  </p>
                </div>
              }
            >
              <ConvolutionLayer
                input={input}
                kernel={kernel}
                conv={pipeline.conv}
                scale={pipeline.scales.conv}
                valueScale={valueScale}
                onKernelChange={setKernel}
                onSelectPreset={handleSelectPreset}
              />
            </SectionShell>

            <SectionShell
              id="relu"
              step={3}
              title="ReLU: jogando fora as evidências negativas"
              subtitle="Uma função simples — max(0, x) — mas é ela que permite a rede aprender coisas que uma reta não descreve."
              accent={PALETTE.positive}
              icon={Zap}
              explanation={
                <div className="space-y-3">
                  <p>
                    A convolução é uma operação <strong className="text-slate-100">linear</strong>.
                    Empilhar dez convoluções seguidas ainda daria uma única transformação linear —
                    dez camadas não valeriam mais que uma.
                  </p>
                  <p>
                    O ReLU quebra essa linearidade da forma mais econômica possível: se o valor é
                    negativo, vira <code className="text-rose-300">0</code>; se é positivo, passa
                    intacto.
                  </p>
                  <p>
                    Interpretação: um número negativo significa{" "}
                    <em>&ldquo;o padrão que este filtro procura não está aqui&rdquo;</em>. Em vez de
                    carregar o quanto ele <em>não</em> está, a rede simplesmente descarta a
                    informação e mantém só as evidências a favor.
                  </p>
                  <p className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 text-emerald-100/80">
                    <strong>Efeito colateral útil:</strong> o mapa fica esparso (cheio de zeros),
                    o que acelera o cálculo. E a derivada é 0 ou 1 — bem mais estável de treinar do
                    que a sigmoide, que satura e mata o gradiente.
                  </p>
                  <p className="text-xs text-slate-500">
                    Passe o mouse sobre uma célula para ver onde ela cai na curva da função.
                  </p>
                </div>
              }
            >
              <ReluLayer
                featureMap={pipeline.conv.output}
                activated={pipeline.activated}
                scale={pipeline.scales.conv}
              />
            </SectionShell>

            <SectionShell
              id="pool"
              step={4}
              title="Max Pooling: resumir mantendo o que importa"
              subtitle="Uma janela 2×2 percorre o mapa em saltos de 2 e guarda apenas o maior valor de cada quadrante."
              accent={PALETTE.pool}
              icon={Minimize2}
              explanation={
                <div className="space-y-3">
                  <p>
                    A janela não se sobrepõe: o <code>stride = 2</code> é igual ao tamanho dela.
                    Cada grupo de 4 valores vira 1, então <code>8×8</code> vira{" "}
                    <code className="text-violet-300">4×4</code> — 75% dos dados desaparecem.
                  </p>
                  <p>
                    Guardar o <strong className="text-slate-100">máximo</strong> tem um significado
                    preciso: importa <em>se</em> o filtro encontrou o padrão naquele quadrante, não{" "}
                    <em>exatamente onde</em> dentro dele.
                  </p>
                  <p className="rounded-lg border border-violet-500/20 bg-violet-500/5 p-3 text-violet-100/80">
                    <strong>Invariância espacial:</strong> desloque o seu desenho um pixel para o
                    lado. O feature map inteiro se desloca junto, mas a matriz depois do pooling
                    tende a permanecer quase idêntica. É assim que a rede reconhece um gato no canto
                    da foto e no centro dela.
                  </p>
                  <p>
                    Menos valores também significa menos parâmetros na camada seguinte e menos risco
                    de a rede decorar o conjunto de treino.
                  </p>
                </div>
              }
            >
              <PoolingLayer
                activated={pipeline.activated}
                pool={pipeline.pool}
                activatedScale={pipeline.scales.conv}
                poolScale={pipeline.scales.pool}
              />
            </SectionShell>

            <SectionShell
              id="dense"
              step={5}
              title="Flatten e camada densa: a decisão final"
              subtitle="A matriz se desenrola em um vetor, passa por uma camada oculta e chega em três neurônios de saída."
              accent={PALETTE.dense}
              icon={Network}
              explanation={
                <div className="space-y-3">
                  <p>
                    O <strong className="text-slate-100">flatten</strong> é a operação mais simples
                    de todas: leia a matriz 4×4 linha por linha e empilhe os valores num vetor de 16
                    posições. Nenhuma conta, só reorganização.
                  </p>
                  <p>
                    A partir daí a estrutura espacial foi abandonada. O que sobrou é uma lista de
                    &ldquo;quais padrões apareceram e com que força&rdquo;.
                  </p>
                  <p>
                    Vêm então duas camadas densas. Cada linha do diagrama é um peso:{" "}
                    <span className="text-emerald-300">verde</span> soma evidência,{" "}
                    <span className="text-rose-300">vermelho</span> subtrai, e a espessura mostra a
                    importância. No fim, o <strong className="text-slate-100">softmax</strong>{" "}
                    converte os três scores em probabilidades que somam 100%.
                  </p>
                  <p className="rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-3 text-cyan-100/80">
                    <strong>Por que existe uma camada oculta?</strong> Sem ela a rede errava. Depois
                    da normalização, um X fica quase exatamente no <em>ponto médio</em> entre uma
                    diagonal <code>\</code> e uma <code>/</code> — e nenhum classificador linear
                    consegue separar o ponto médio de dois exemplos da mesma classe. Medido: só com
                    a camada de saída, o acerto não passava de 70% nem nos próprios exemplos de
                    treino. É pelo mesmo motivo que LeNet e VGG empilham camadas densas.
                  </p>
                  <p>
                    As <strong className="text-slate-100">unidades ocultas</strong> acesas são as
                    que dispararam para o seu desenho; as marcadas com{" "}
                    <code className="text-slate-500">0</code> foram zeradas pelo ReLU. Cada uma
                    aprendeu a procurar uma combinação diferente de regiões do vetor.
                  </p>
                  <p className="text-xs text-slate-500">
                    Estes pesos são treinados de verdade, no seu navegador: retropropagação com Adam
                    sobre ~1.700 exemplos gerados a partir dos gabaritos (variando espessura, falhas
                    no traço e posição). O kernel, sim, continua sendo sua escolha — e é por isso
                    que a qualidade da predição muda quando você troca o filtro.
                  </p>
                </div>
              }
            >
              <FlattenLayer
                pooled={pipeline.pool.output}
                flat={pipeline.flat}
                poolScale={pipeline.scales.pool}
                model={pipeline.model}
                prediction={pipeline.prediction}
                isTraining={pipeline.isTraining}
              />
            </SectionShell>
          </div>

          <footer className="mt-16 border-t border-slate-800 pt-6 text-xs text-slate-600">
            Construído para ensinar: cada número na tela é calculado de verdade, no navegador, a
            partir do que você desenhou.
          </footer>
        </div>
      </main>
    </div>
  );
}
