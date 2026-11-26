# Arquitetura — decisões e por quês

Este documento explica, em linguagem simples, **por que** o projeto está montado
assim. Cada seção tem o problema, a decisão e o que isso custa.

---

## 1. Monorepo com pnpm workspaces

**Problema:** o jogo precisa de regras idênticas no cliente e, a partir da Fase 3,
no servidor. Duplicar código leva a divergências (o clássico "no meu celular deu
certo, no servidor não").

**Decisão:**
```
apps/web      → cliente (React + Phaser + PWA)
packages/shared → regras puras, sem DOM, sem React, sem Phaser
apps/server   → entram na Fase 3
```

`packages/shared` é consumido **direto do TypeScript** (o Vite resolve
`@vida/shared` para `packages/shared/src/index.ts`). Não há `tsc --build` no meio,
o que elimina uma fonte inteira de erro (build desatualizado) e mantém o
`pnpm dev` instantâneo.

**Custo:** o pacote não pode usar nada específico de navegador (`window`,
`document`). Isso é bom: força as regras a serem puras e testáveis. Onde precisa
de `crypto.randomUUID`, há uma checagem e fallback (`shared/src/ids.ts`).

Regra prática: **se precisa de `window`, não é regra — é plataforma.**

---

## 2. Tempo: milissegundos de jogo, passo fixo

**Problema:** simulações que usam `deltaTime` de frame acumulam erro e dependem da
taxa de quadros. Em um celular a 30 FPS, um dia duraria diferente de um desktop a
144 FPS — e o servidor chegaria a um terceiro resultado.

**Decisão:** todo o tempo do jogo é expresso em **gameMs** (24 h = 86.400.000 ms de
jogo). A conversão é uma linha:

```ts
gameMs = realMs / dayLengthMs * 24h
```

O relógio avança em **ticks fixos de 250 ms reais** (`RoomScene.startClock`), e
cada save guarda seu próprio `dayLengthMs`. Mudar "duração do dia" para 12 min ou
48 min é um ajuste no save, sem tocar em nenhuma outra regra.

**Custo:** um tick de 250 ms significa que eventos de "hora cheia" podem chegar
com até 250 ms de atraso. Irrelevante para um jogo de simulação, e evita `setInterval`
por minuto (que desalinha quando a aba fica em segundo plano).

---

## 3. Fronteira Phaser ↔ React

**Problema:** o maior risco de desempenho em jogos React+Phaser é o loop do jogo
atualizando estado do React dezenas de vezes por segundo.

**Decisão:** uma **ponte de eventos tipada** (`game/events.ts`):

```
Phaser                                React
-------                               -------
RoomScene  ── 'object-tapped' ──►     PlayScreen abre a bottom sheet
RoomScene  ── 'hour-changed'   ──►     HUD atualiza o relógio (1x por hora de jogo)
RoomScene  ── 'floor-tapped'   ──►     (Fase 1) calcula caminho
GameCanvas ── setPaused(bool)  ──►     RoomScene pausa tweens e relógio
```

Consequências:

- Os componentes do HUD só re-renderizam quando **um evento discreto** chega.
- A cena não importa Zustand: é testável e substituível.
- O canvas fica em um componente que nunca re-renderiza (engine em `useRef`).

**Custo:** eventos precisam ser declarados em `GameEventMap`. É uma pequena
cerimônia que evita `any` no caminho mais quente do jogo.

---

## 4. Carregamento do Phaser

**Problema:** o engine tem ~1,2 MB. Baixá-lo antes do menu atrasaria o primeiro
paint em 4G.

**Decisão:**

```tsx
// ao entrar no jogo — não no boot
const { mountGame } = await import('./mount');
```

E `preloadGameChunk()` aquece o chunk quando o menu termina de pintar (via
`requestIdleCallback`), então o toque em "Jogar" é praticamente instantâneo.

**Custo:** existe um estado "carregando" no jogo (spinner), e ele aparece de
verdade na primeira visita em conexões lentas.

---

## 5. Arte procedural (SVG) em vez de PNG

**Problema:** um jogo de simulação de vida precisa de centenas de peças de arte.
Atlas PNG exigem reexportação a cada ajuste, ficam pesados e borram em telas 3x.

**Decisão:**

1. A arte é composta por funções que retornam **strings SVG** (`characterSvg`,
   `roomSvg`).
2. O React usa a mesma string como `data:` URI (`<img>`), o Phaser rasteriza uma
   vez para uma textura usando a densidade da tela.
3. O layout guarda **tamanho em pixels de projeto por pixel de SVG** (`scale`), e
   a cena aplica `setDisplaySize`, mantendo tudo independente de DPR.

Ganhos: ~0 KB de imagens, nitidez em qualquer aparelho, um só lugar para mudar a
arte, e a possibilidade de re-tema (estações, eventos) trocando cores da paleta.

**Custo:** rasterizar SVG custa CPU no boot (poucos ms por textura, feitas em
paralelo). Em qualidade "Baixa" a cena reduz a escala de rasterização.

---

## 6. Estado e persistência

**SaveGame** é um objeto único, versionado, com uma função de migração:

```
localStorage['vida:save']         → versão atual
localStorage['vida:save:backup']  → versão anterior (se a escrita falhar)
localStorage['vida:settings']     → rascunho antes do primeiro jogo
```

Escrita com **debounce de 600 ms** e **flush** em `visibilitychange`/`pagehide`.
Leitura tenta a principal; se o JSON estiver corrompido, tenta o backup e avisa a
UI (`storageWarning: 'backup'`). `migrateSave` rejeita versões futuras em vez de
adivinhar.

**Custo:** por 600 ms, o `localStorage` pode ficar defasado do estado em memória.
Isso é coberto pelo flush ao sair e pelo botão de pausa (que também salva).

---

## 7. Câmera e layout

A cena é desenhada em um canvas virtual de **400×720**. A câmera usa ajuste
"contain": `zoom = min(largura/400, altura/720)` e centraliza. O fundo (parede e
piso) é pintado além das bordas, então telas mais altas mostram mais cena em vez
de barras.

Hotspots são **zonas declaradas** em `layout.ts` (centro + tamanho ≥ 44 px),
não caixas desenhadas sobre a arte. Isso permite mudar o desenho sem quebrar o
toque, e o teste `art.test.ts` garante que nenhum hotspot fica minúsculo.

---

## 8. Internacionalização

- `i18next` + arquivos JSON (`pt-BR.json`, `en.json`), nada de texto em componente.
- O idioma é resolvido **antes** do React montar (em `main.tsx`), então não existe
  "flash" de português para quem usa inglês.
- Um teste compara as duas árvores de chaves, rejeita strings vazias e confere os
  placeholders `{{...}}` — se alguém adicionar uma chave só em um idioma, o CI
  falha.

---

## 9. Acessibilidade como contrato de componente

Em vez de "lembrar" de acessibilidade em cada tela, as regras estão nos
componentes compartilhados e testadas:

| Componente | Contrato |
| --- | --- |
| `Button` | alvo ≥ 44 px, `aria-busy` quando carregando, vibração opcional |
| `Toggle` | `role="switch"` + `aria-checked` + marca ✓ (não só cor) |
| `SegmentedControl` | `role="radiogroup"` com opções `radio` |
| `Sheet` | `role="dialog"`, `aria-modal`, Esc fecha, foco preso e devolvido |
| `NeedBar` | `role="meter"` com `aria-valuetext` e texto numérico visível |

---

## 10. O que foi deliberadamente adiado

| Adiado | Motivo |
| --- | --- |
| Servidor/Colyseus | Só faz sentido depois de o modo solo estar divertido (Fase 3) |
| Supabase | Contas e LGPD entram junto com o servidor |
| Playwright | Precisa de navegador no CI; a base atual não tem; os testes de UI em jsdom cobrem a lógica das telas |
| Áudio | Fase 1, junto com os eventos de ação que geram os sons |
| Persistência da casa real | A cena é "de vitrine" na Fase 0; a Fase 1 liga o catálogo de itens à cena |

---

## Fase 1 — Arquitetura do jogo solo

### Do tempo real ao mundo
```
setInterval 250ms (PlayScreen)
   └─ gameStore.tickWorld(elapsedRealMs)
        └─ advanceWorld(world, realMs)      ← pura, em @vida/shared
             • relógio  += realMs / dayLengthMs * 24h * speed
             • needs    −= decayRate(need) * horasDeJogo − efeitosDaAção
             • ação     termina? (duração / energia / fome) → evento
        └─ handle.setClockMs(clock.totalMs)  ← a cena só desenha o céu/luzes
```
Duas regras que evitam 90% dos bugs desse tipo de jogo:

1. **O tempo de jogo é a única fonte**: nenhuma tela lê `Date.now()` para
   simular. `savedAt` é usado apenas para o catch-up offline.
2. **A cena é burra**: `RoomScene` nunca escreve no save. Ela recebe
   `play-action`, `walk-to`, `set-paused` e emite `object-tapped`,
   `floor-tapped`, `walk-ended`. Isso mantém o Phaser substituível.

### Caminho e colisão
`buildBlockedGrid` transforma `ROOM_PLACEMENTS` numa grade 22×16 (margem de 1
célula nas laterais e na frente). `findRoomPath` é BFS 4-direções — barato numa
grade desse tamanho e sempre determinístico (mesmo caminho no cliente e, no
futuro, no servidor). A cena converte a lista de células em tweens de 74 px/s e
avisa `walk-ended` quando chega, que é quando o React grava a posição.

### Geometria de tela
`game/roomGeometry.ts` é a única ponte entre células e pixels:
`PLAN.cellW`, `rowY(row) = 214 + (row/16)^0.78 * 520` (as linhas traseiras são
comprimidas, as da frente mais altas — a sensação de "vista de cima inclinada"),
`projectRect`, `depthFor`, `screenToCell` (busca binária). Os scripts de arte
usam **as mesmas** funções, então a prévia em PNG e o jogo não divergem.

### Ações e animação
`beginAction` guarda `startedAtMs`, `durationMs`, `speed` e os efeitos totais
somados do catálogo. `actionProgress` é derivada do relógio, então a barra de
progresso e o `skipAction` funcionam mesmo depois de fechar o app no meio da
ação. A cena recebe `playAction(itemId, interactionId)` e escolhe pose/emoji:
`bed` → deitado, `sofa` → sentado, `stove` → balanço, `shower` → vapor.

### Tutorial
`profile.tutorialStep` + `tutorialDone` moram no save (não em React state), então
o tutorial sobrevive a um restart e não pode "dessincronizar" da UI. Sinais
(`walked`, `action-completed`, `woke-up`) passam por `applyTutorialSignal`, que
aceita ações fora de ordem e nunca volta um passo.

### Áudio
`platform/audio.ts` cria o `AudioContext` no primeiro toque (exigência dos
navegadores), agenda a trilha em compassos de 2,4 s e toca 11 efeitos com
osciladores + ruído filtrado. `applySettings` relê `musicVolume`/`sfxVolume` do
save a cada mudança nos Ajustes. Sem Web Audio, tudo é no-op.

### Persistência
`SAVE_VERSION = 2`. A migração v1→v2 adiciona `tutorialStep`, zera
`action`/`position`, normaliza a aparência (campos novos ganham default) e faz
merge de `DEFAULT_SETTINGS`. `persistSoon` guarda o **último** save num módulo
(`latestSave`) e o timer escreve esse objeto — assim `flushSave` nunca perde a
última mudança. O catch-up offline (`simulateAway`) roda o mesmo `advanceWorld`
com um teto de 8 h de jogo.
