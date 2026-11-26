# Roadmap — fases, entregas e critérios de aceite

Regra do projeto: **uma fase por vez, com protótipo jogável no fim**. Nada de
começar a Fase 3 com a Fase 1 pela metade.

---

## Fase 0 — Base ✅ concluída

**Entregue**
- Monorepo pnpm com `apps/web` + `packages/shared`.
- React 19 + Vite 7 + TypeScript estrito, rotas lazy.
- Phaser 3.90 carregado sob demanda; cena da sala com arte SVG procedural.
- PWA instalável: manifest, ícones (incluindo maskable), service worker com
  precache (~1,95 MB) e aviso de atualização dentro do app.
- Splash, menu principal, tela de jogo com HUD, ajustes, amigos (shell), 404.
- Relógio do jogo (1 dia = 24 min) com ciclo dia/noite e lâmpadas.
- Save local versionado, com backup, migração e reset.
- Necessidades: modelo e barras no HUD (dados vindos do save).
- i18n PT-BR/EN com teste de completude.
- Tela de Ajustes com qualidade, orientação, acessibilidade e armazenamento.

**Critérios de aceite**
- [x] `pnpm install && pnpm dev` sobe sem erro em Node 22.
- [x] `pnpm typecheck`, `pnpm test` e `pnpm build` passam.
- [x] O app funciona em retrato a 360×640 e 390×844 sem rolagem indesejada.
- [x] Offline: após a primeira visita, o app abre e o modo solo funciona.
- [x] Nenhum texto de interface fora dos arquivos de i18n.
- [x] Alvos de toque ≥ 44 px e navegação por teclado nas telas de UI.

**Pendente (assumido)**
- Áudio (Fase 1).
- Criação de personagem, ações reais sobre necessidades, loja e construção.

---

## Fase 1 — Solo jogável ✅ concluída

**Objetivo:** o jogador cria o personagem, cuida dele e sente que o dia passa.

**Entregas**
1. Criação de personagem em etapas (aparência → traços → aspiração → nome),
   com pré-visualização ao vivo usando `characterSvg`.
2. Movimento por toque com `findPath` (já em `shared/grid.ts`), interpolação e
   cancelamento ao tocar de novo.
3. Interação com 5 objetos (cama, geladeira, chuveiro, banheiro, sofá) aplicando
   `effects` e `durations` do catálogo, com barra de progresso e possibilidade de
   pular (fast-forward do restante da ação).
4. Loop de necessidades: decaimento por hora de jogo, recuperação por ação,
   limiares críticos com mudança de comportamento (personagem mais lento, humor).
5. Sono: dormir preenche energia e avança o tempo, com "acordar" automático.
6. Persistência completa (necessidades, relógio, posição, ações).
7. Tutorial de 5 minutos guiado pelo estado do save (flags em `profile`).
8. Áudio: trilha lo-fi em loop, sons curtos para 6 ações, volumes das configurações.
9. Aviso de "necessidade crítica" no HUD e atalho para o objeto que resolve.

**Critérios de aceite — todos verificados em teste automático**
- ✅ Sessão de 10 min sem travar; relógio avança exatamente 24 min por dia
  (`dayLengthMs` 1 440 000; 12/24/48 min nos Ajustes).
- ✅ Dormir 8 h de jogo recupera energia e o personagem acorda com fome
  (`lifeLoop.test.ts`, `simulation.test.ts`).
- ✅ Fechar e reabrir preserva necessidades, relógio e posição
  (`lifeLoop.test.ts` — reinício real do store + `localStorage`).
- ✅ Testes determinísticos de 24 h simuladas, ações e tutorial
  (`advanceWorld` é pura: recebe tempo real, sem relógio do sistema).

**Como ficou** (decisões que valem para as próximas fases)
- Uma única função `advanceWorld` roda o mundo nos 3 ritmos: 1× normal, 4× em
  ação e 30× no sono. Tudo em tempo de jogo, então o resultado não depende do FPS.
- A cena Phaser **não** guarda estado de jogo: recebe o relógio e os comandos de
  animação do React. Foi o que permitiu testar o loop inteiro sem WebGL.
- O sono termina por 4 motivos (`energia`, `fome`, `duração`, `manual`), e o
  motivo volta no evento — a UI escolhe a mensagem certa sem adivinhar.
- Áudio 100% sintetizado (Web Audio), sem arquivos: mixagem instantânea e
  nenhum download extra no primeiro acesso.

---

## Fase 2 — Vida e IA

**Entregas**
- Utility AI autônoma (pontua ações por necessidade, traço, humor, hora e objetivo).
- Emoções e memórias com efeito temporário no humor.
- 2 carreiras com níveis, salário, turno e faltas; dinheiro e loja básica.
- Modo construção simples (grade 1 m, paredes/pisos, 20 móveis, limite 200 itens).
- Bairro com 3 locais e 5 NPCs com rotina.
- Relacionamentos base (amizade/romance) entre personagens locais.

**Critérios de aceite**
- IA escolhe comer quando fome < 25 e não escolhe dormir às 15h com energia cheia.
- Comprar móvel debita moedas, entra no inventário e pode ser colocado.
- Promoção de carreira aumenta salário e bloqueia compras acima do saldo.
- Testes da IA com sementes fixas (determinísticos).

---

## Fase 3 — Contas e amigos

**Entregas**
- `apps/server` (Node + Colyseus) e Supabase para contas e dados persistentes.
- Login convidado + e-mail; código de amigo real, busca e pedidos (aceitar/bloquear).
- Lista de amigos com status online e "visitando".
- Visita à casa de um amigo sincronizada (10–20 atualizações/s, deltas,
  interpolação, reconexão automática).
- Servidor autoritativo para dinheiro, compras e interações importantes.
- LGPD: exportação e exclusão de conta.

**Critérios de aceite**
- Dois celulares veem um ao outro andando na casa visitada com < 150 ms de atraso
  em 4G.
- Nenhum cliente consegue alterar dinheiro/item sem passar pela validação do servidor.
- Queda de rede de 10 s reconecta e restaura o estado.

---

## Fase 4 — Mundo compartilhado

**Entregas**
- Bairro com salas de até 8 jogadores.
- Relacionamentos entre personagens de jogadores diferentes.
- Chat por sala com filtro de palavras, denúncia e bolhas de fala.
- Convites para atividades (cinema, festa, jantar, academia) com regras.
- Progresso offline (até 8 h) simulado pelo servidor.

**Critérios de aceite**
- 8 jogadores simultâneos com atualizações estáveis.
- Chat bloqueia palavras ofensivas e registra denúncias.
- Voltar após 3 h offline mostra necessidades simuladas e memórias do período.

---

## Fase 5 — Polimento

- Otimização: orçamento de 60 FPS em Android intermediário (medido), carregamento
  inicial < 5 MB, atlas de texturas se necessário.
- Acessibilidade: leitor de tela na cena, alternativa textual ao jogo, contraste AA.
- Configurações completas e migração de save entre aparelhos.
- Eventos sazonais e clima.
- Playwright em CI para fluxos móveis; testes de integração de multiplayer.
- Deploy (Vercel + Render) com monitoramento e documentação final.
