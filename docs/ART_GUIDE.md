# Guia de arte

Todo o visual do jogo é **SVG gerado por código**. Não existem PNGs de arte no
repositório (só os ícones do app, rasterizados a partir dos SVGs da marca).

## Princípios

1. **Pastel com contraste suave.** Nada de cores saturadas em área grande; o
   destaque (coral) fica para o que é tocável.
2. **Formas arredondadas.** Cantos de 2–10 px no SVG, nunca pontas vivas.
3. **Luz vinda da janela.** Sombras são elipses suaves embaixo dos móveis, sempre
   na horizontal, nunca projetadas para cima.
4. **Leitura a 1/3 do tamanho.** Se um móvel não é reconhecível pequeno, ele
   precisa de menos detalhe, não de mais.
5. **Âncora no centro da base.** Todo móvel é desenhado com o ponto de contato
   com o chão no centro inferior do viewBox.
6. **Nada de marca registrada.** Nomes, símbolos e personagens são originais.

## Paleta

Definida em `apps/web/src/game/art/palette.ts` (`ART`). Principais:

| Papel | Hex |
| --- | --- |
| Coral (ação/destaque) | `#FF8A6A` / escuro `#E8674F` |
| Menta (calma/plantas) | `#8FD6B5` / `#5FB894` |
| Sol (luz/dinheiro) | `#F7C568` / `#E5A83F` |
| Céu (água/ar) | `#8CBFE6` / `#A9D9F2` |
| Lilás (decoração) | `#B79CE8` / `#9377C9` |
| Madeira | `#C69063` / `#A9713F` / claro `#E0B489` |
| Piso | `#F6DFC2` com veios `#EFD1AE` |
| Parede | `#FFF6E6` com rodapé `#F0DCC2` |
| Tinta (texto) | `#4A3A33` / `#7A6459` |

Necessidades usam cores próprias (`NeedBar.tsx`), sempre acompanhadas de ícone e
número — cor nunca é o único indicador.

## Personagem

Arquivo: `apps/web/src/game/art/characterSvg.ts`.

- Proporções chibi: cabeça ≈ 1/3 do corpo, olhos grandes, boca pequena.
- Camadas, de trás para frente: cabelo de trás → pernas → corpo → braços → pescoço
  → cabeça → franja → rosto → acessórios.
- 10 penteados, 10 roupas, 10 tons de pele, 10 cores de cabelo, 10 de roupa
  (todas definidas em `packages/shared/src/character.ts`).
- `mode: 'bust'` recorta a cabeça e os ombros para o retrato do HUD.
- `mood` e `blink` mudam apenas olhos/boca — o resto do desenho é reaproveitado.

Para adicionar um penteado:

1. Adicione o id em `HAIR_STYLES` (`packages/shared/src/character.ts`).
2. Trate o id em `backHair` e `frontHair` (`characterSvg.ts`). A franja comum
   (`cap`) deve ser mantida para o cabelo nunca parecer careca.
3. Rode `npx tsx scripts/preview-character.ts` e confira a prancha.

## Móveis

Arquivo: `apps/web/src/game/art/roomSvg.ts`.

Cada peça é uma função `xxxSvg()` que devolve um SVG completo com `width`/`height`
declarados (o registro de texturas usa esses valores como tamanho de projeto).

Checklist para um móvel novo:

1. Desenhe com a base no centro inferior do viewBox.
2. Use só cores de `ART` (importe e referencie).
3. Registre em `FURNITURE` com `key`, `w`, `h` e chave de i18n (`items.*`).
4. Adicione o texto em `items` nos dois idiomas (`pt-BR.json` e `en.json`).
5. Posicione em `ROOM_ITEMS` (x, y de base, `scale` = px de projeto por px de SVG).
6. Declare um hotspot em `HOTSPOTS` com pelo menos 44×44 (o teste garante).
7. Rode `npx tsx scripts/preview-layout.ts /tmp/layout.png 2` e confira.

## Composição da sala

- Duas fileiras: **parede** (cama, estante, geladeira) e **frente** (sofá, mesinha,
  planta). O personagem caminha na faixa aberta entre elas (600–710 no eixo y).
- A parede ocupa até y = 292; o piso vai até 720.
- Nada importante no centro-baixo: é onde o personagem anda e onde a Fase 1 vai
  desenhar o caminho.
- Profundidade = valor de `y` da base (pintor). Itens com `depth` explícito só
  quando precisam ficar atrás de outro (ex.: tapete).

## Céu e ciclo do dia

`packages/shared/src/daynight.ts` define keyframes de cor (céu, tinta de ambiente
e intensidade). A cena interpola entre eles e:

- tinge a textura da janela (azul de dia, pêssego no amanhecer, roxo à noite);
- aplica uma camada translúcida sobre a sala;
- acende os brilhos das lâmpadas (`LIGHTS`) quando `isNight` é verdadeiro.

## Ícones do app

`apps/web/public/icons/icon.svg` é a fonte. Rode `pnpm icons` para gerar todos os
tamanhos, incluindo o **maskable** (com 12% de margem de segurança). O script não
faz parte do build: os PNGs ficam versionados para o repositório não depender de
`sharp` para compilar.
