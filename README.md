# CNN por dentro

Laboratório interativo para ensinar **o que acontece em cada camada de uma Rede Neural Convolucional**. A aplicação não é um diagrama estático: cada número na tela é calculado de verdade no navegador, a partir da imagem que você desenha e do filtro que você escolhe.

O público-alvo são estudantes que precisam entender o pipeline — não só a fórmula, mas o efeito visual de cada operação.

---

## O que este projeto mostra

Uma CNN clássica (no espírito de LeNet) processa a imagem em etapas. Aqui o recorte didático é:

```
10×10  →  conv 3×3  →  8×8  →  ReLU  →  8×8  →  pool 2×2  →  4×4  →  flatten  →  16  →  densa+ReLU  →  14  →  softmax  →  3
```

Com o kernel **Detector de Bordas + padding**, a convolução não corta as bordas e o mapa permanece 10×10. O pooling vira 5×5 e o vetor achatado passa a ter 25 posições:

```
10×10  →  conv 3×3 pad1  →  10×10  →  ReLU  →  10×10  →  pool 2×2  →  5×5  →  flatten  →  25  →  …
```

As três classes de saída são:

| Classe na interface | O que a rede tenta reconhecer |
| --- | --- |
| É um X | duas diagonais cruzadas |
| É um Círculo | contorno fechado |
| É uma Linha | traço único (diagonal, vertical ou horizontal) |

---

## Como executar

Requisitos: **Node.js 20+** (testado com Node 22) e npm.

```bash
npm install
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000).

Outros comandos:

```bash
npm run build    # build de produção
npm run start    # serve o build
npm run lint     # ESLint
```

Não há backend: convolução, ReLU, pooling e o treino da camada densa rodam inteiramente no cliente.

---

## Como usar o laboratório

A página é um percurso de cima para baixo. O menu à esquerda destaca a etapa visível e mostra a predição atual.

### 1. Camada de entrada — desenhe a imagem

A imagem é um grid **10×10** em tons de cinza. Cada célula mostra o valor numérico do pixel.

- Clique e arraste para pintar; use a borracha para apagar.
- Ajuste a **intensidade** do pincel (0,25 / 0,5 / 0,75 / 1).
- Alterne a escala entre **0–1** e **0–255** (é a mesma informação, só muda a unidade).
- Carregue um padrão pronto: Letra X, Círculo, Linha Diagonal, Linha Vertical.
- **Quadrado** e **Cruz** estão em “Fora do treino”: a rede nunca viu essas formas. Servem para explorar a convolução e ver como o classificador reage a algo desconhecido.

Qualquer alteração no grid se propaga imediatamente para as camadas seguintes.

### 2. Convolução — escolha o filtro e veja a conta

O kernel 3×3 desliza sobre a imagem. Em cada parada:

1. multiplica pixel a pixel pelo peso correspondente;
2. soma os 9 produtos — isso vira **um** pixel do feature map.

**Controles**

- Escolha um preset ou edite os 9 pesos à mão.
- **Animar** percorre cada posição; o slider e as setas permitem ir passo a passo.
- Passe o mouse sobre uma célula do feature map para pular direto àquela conta.
- “Revelar mapa completo” mostra o resultado inteiro de uma vez.

**Kernels disponíveis**

| Preset | O que procura |
| --- | --- |
| Detector de Bordas | Laplaciano (soma zero): regiões uniformes se anulam; só restam transições. |
| Detector de Bordas + padding | O mesmo Laplaciano, com moldura de zeros. O kernel também centra nos pixels da borda; a saída não encolhe. |
| Borda Vertical (Sobel X) | Traços verticais. |
| Borda Horizontal (Sobel Y) | Traços horizontais. |
| Sharpen | Aumenta o contraste local. |
| Blur | Média 3×3: suaviza, apaga detalhes. |
| Identidade | Copia o pixel central (controle). |
| Emboss | Relevo, destacando um lado das bordas. |

A **soma dos pesos** aparece abaixo do editor: soma zero favorece detecção de bordas; soma diferente de zero desloca o brilho da saída.

**Padding, em uma frase:** sem ele, um kernel 3×3 nunca centra na borda da imagem — e é ali que um detector de bordas mais precisa olhar. Com `padding = 1`, a imagem ganha uma moldura de zeros e o contorno entra no cálculo.

### 3. ReLU — o que é negativo vira zero

`f(x) = max(0, x)`. Valores negativos (o padrão *não* está ali) são zerados; positivos passam intactos. Isso introduz não-linearidade: empilhar convoluções sem ReLU ainda seria uma única transformação linear.

Passe o mouse sobre uma célula para ver o ponto correspondente no gráfico da função.

### 4. Max pooling — reduzir sem perder o “se o padrão apareceu”

Uma janela **2×2** com **stride 2** guarda só o maior valor de cada quadrante. 8×8 vira 4×4 (ou 10×10 vira 5×5 com padding): cerca de 75% dos dados desaparecem.

O efeito didático é a **invariância espacial**: desloque o desenho um pixel para o lado. O feature map se move, mas a matriz após o pooling tende a permanecer parecida.

### 5. Flatten e camada densa — a decisão

A matriz do pooling é lida linha a linha e empilhada num vetor. A estrutura espacial acaba aqui: o que sobra é “quais padrões apareceram e com que força”.

Esse vetor passa por:

1. **camada oculta** (14 unidades + ReLU);
2. **saída** (3 neurônios + softmax), com barras de probabilidade.

Linhas **verdes** são pesos positivos (evidência a favor); **vermelhas**, contra. Passe o mouse numa unidade oculta ou num neurônio de saída para destacar os caminhos correspondentes.

O indicador “acurácia no treino” na etapa 5 é a acurácia do classificador nos exemplos sintéticos usados para treinar *esta* combinação kernel + padding — não um dataset externo.

---

## O que é cálculo real e o que é recorte didático

| Parte | Como funciona aqui |
| --- | --- |
| Convolução, ReLU, pooling, flatten, softmax | Matemática real, implementada em TypeScript (`src/lib/cnn.ts`). |
| Kernel | **Você** escolhe os pesos. Numa CNN treinada, eles viriam do backpropagation. |
| Camada densa | Treinada de verdade no navegador (Adam + entropia cruzada) sempre que o kernel ou o padding mudam. |
| Número de filtros | Um único kernel, para caber numa visualização célula a célula. Redes reais usam dezenas em paralelo. |

A camada oculta existe por um motivo mensurável: só com a saída linear, um X fica quase no ponto médio entre uma diagonal `\` e uma `/`. Nenhum classificador linear separa o ponto médio de dois exemplos da *mesma* classe. Sem a oculta, o acerto no próprio treino não passava de ~70%.

---

## Paleta didática

Cores repetidas em todas as etapas, de propósito:

| Cor | Significado |
| --- | --- |
| Azul | imagem de entrada |
| Laranja | kernel / janela deslizante |
| Verde | valor positivo, evidência a favor |
| Vermelho | valor negativo (o que o ReLU zera) / peso contra |
| Violeta | pooling |
| Ciano | classificação / neurônio vencedor |

---

## Arquitetura do código

A matemática é pura e independente da UI. Os componentes só renderizam o que `useCnnPipeline` calcula.

```
src/
  app/                    # Next.js App Router (página única)
  hooks/
    useCnnPipeline.ts     # encadeia conv → ReLU → pool → flatten → classificar
    useStepPlayer.ts      # cursor da animação (play / passo / velocidade)
  lib/
    cnn.ts                # convolução, padding, ReLU, pooling, flatten, softmax
    kernels.ts            # presets de filtro
    patterns.ts           # desenhos 10×10 e classes de saída
    training.ts           # gabaritos aumentados (translação, dilatação, falhas)
    classifier.ts         # MLP  flatten → 14 → 3, treinada com Adam
    colors.ts             # paleta e formatação numérica
  components/
    layers/               # uma pasta visual por etapa da CNN
    matrix/               # MatrixGrid + editor de kernel
    ui/                   # layout das seções, legendas, playback
```

Quando você pinta um pixel, só a imagem muda e o pipeline é barato. Quando você troca o kernel, a camada densa é retreinada (~cento e poucos milissegundos). Enquanto isso, as matrizes já atualizam; a predição chega em seguida (`useDeferredValue`).

---

## Experimentos sugeridos

1. **Padding vs. valid.** Mesmo desenho, alterne “Detector de Bordas” e “Detector de Bordas + padding”. Compare o contorno no feature map.
2. **Soma dos pesos.** Kernel de soma zero vs. soma ≠ 0 em uma região uniforme.
3. **Invariância.** Desloque um X um pixel e compare a matriz pós-pooling.
4. **Filtro ruim.** Troque para Blur e veja a confiança da classificação cair.
5. **Fora do treino.** Carregue Quadrado ou Cruz: a rede é forçada a escolher entre X, círculo e linha.
6. **Kernel manual.** Zere tudo e coloque `1` só no centro (identidade) ou monte um Sobel à mão.

---

## Stack

- **Next.js** (App Router) + React + TypeScript
- **Tailwind CSS** v4
- **Lucide React** (ícones)
- **Framer Motion** (janela deslizante e transições)

Tudo roda no cliente. Não há API, banco nem pesos pré-gravados em arquivo: o classificador nasce no carregamento da página, a partir dos gabaritos em `src/lib/training.ts`.
