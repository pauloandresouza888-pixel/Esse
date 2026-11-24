import type {
  ActivityType, FloorStyleId, GameState, NeedKey, Needs, SkillKey, WallStyleId,
} from './types';

export interface InteractionDef {
  id: ActivityType;
  label: string;
  icon: string;
  description: string;
  duration: number;
  effects: Partial<Needs>;
  cost?: number;
  money?: number;
  skill?: { key: SkillKey; amount: number };
  mood?: number;
  counter?: string;
  target: 'object' | 'sim' | 'none';
  pose: 'stand' | 'sit' | 'lie' | 'exercise' | 'clean' | 'work';
  need?: NeedKey;
}

export const INTERACTIONS: Record<ActivityType, InteractionDef> = {
  cook: { id: 'cook', label: 'Cozinhar refeição', icon: '👩‍🍳', description: 'Prepara uma refeição caseira e evolui Culinária.', duration: 35, effects: { hunger: 42, fun: 6 }, cost: 28, skill: { key: 'cooking', amount: 20 }, counter: 'cook', target: 'object', pose: 'stand', need: 'hunger' },
  quickMeal: { id: 'quickMeal', label: 'Lanche rápido', icon: '🥪', description: 'Um lanche prático para matar a fome.', duration: 18, effects: { hunger: 30, energy: 4 }, cost: 18, counter: 'cook', target: 'object', pose: 'stand', need: 'hunger' },
  eat: { id: 'eat', label: 'Comer', icon: '🍽️', description: 'Senta-se para fazer uma refeição.', duration: 25, effects: { hunger: 48, social: 6 }, cost: 12, target: 'object', pose: 'sit', need: 'hunger' },
  sleep: { id: 'sleep', label: 'Dormir', icon: '😴', description: 'Recupera muita energia.', duration: 180, effects: { energy: 85, hygiene: -5, bladder: -12 }, target: 'object', pose: 'lie', need: 'energy' },
  nap: { id: 'nap', label: 'Tirar uma soneca', icon: '💤', description: 'Um descanso curto.', duration: 60, effects: { energy: 38, bladder: -5 }, target: 'object', pose: 'lie', need: 'energy' },
  shower: { id: 'shower', label: 'Tomar banho', icon: '🚿', description: 'Recupera higiene e dá uma leve animada.', duration: 25, effects: { hygiene: 72, energy: 5, fun: 4 }, target: 'object', pose: 'stand', need: 'hygiene' },
  bath: { id: 'bath', label: 'Banho relaxante', icon: '🛁', description: 'Higiene, diversão e relaxamento.', duration: 45, effects: { hygiene: 65, fun: 18, energy: 8 }, target: 'object', pose: 'lie', need: 'hygiene' },
  washHands: { id: 'washHands', label: 'Lavar as mãos', icon: '🧼', description: 'Rápido retoque de higiene.', duration: 8, effects: { hygiene: 18 }, target: 'object', pose: 'stand', need: 'hygiene' },
  useToilet: { id: 'useToilet', label: 'Usar o banheiro', icon: '🚽', description: 'Alivia a bexiga.', duration: 10, effects: { bladder: 80, hygiene: -3 }, target: 'object', pose: 'sit', need: 'bladder' },
  watchTv: { id: 'watchTv', label: 'Assistir TV', icon: '📺', description: 'Um programa para relaxar.', duration: 60, effects: { fun: 38, energy: -5 }, target: 'object', pose: 'sit', need: 'fun' },
  read: { id: 'read', label: 'Ler um livro', icon: '📚', description: 'Diversão tranquila e Lógica.', duration: 70, effects: { fun: 22, energy: -4 }, skill: { key: 'logic', amount: 24 }, counter: 'logic', target: 'object', pose: 'sit', need: 'fun' },
  playGames: { id: 'playGames', label: 'Jogar videogame', icon: '🎮', description: 'Diversão garantida.', duration: 55, effects: { fun: 44, social: 4 }, target: 'object', pose: 'sit', need: 'fun' },
  workOut: { id: 'workOut', label: 'Treinar', icon: '🏋️', description: 'Treino intenso: gasta energia, ganha Condicionamento.', duration: 65, effects: { fun: 12, energy: -16, hygiene: -20 }, skill: { key: 'fitness', amount: 30 }, counter: 'workout', target: 'object', pose: 'exercise', need: 'fun' },
  practiceArt: { id: 'practiceArt', label: 'Pintar', icon: '🎨', description: 'Expressão criativa.', duration: 80, effects: { fun: 30, energy: -6 }, skill: { key: 'creativity', amount: 30 }, counter: 'art', target: 'object', pose: 'stand', need: 'fun' },
  practiceMusic: { id: 'practiceMusic', label: 'Tocar instrumento', icon: '🎸', description: 'Música, criatividade e um pouco de carisma.', duration: 70, effects: { fun: 26, energy: -5 }, skill: { key: 'creativity', amount: 25 }, counter: 'art', target: 'object', pose: 'stand', need: 'fun' },
  practiceCharisma: { id: 'practiceCharisma', label: 'Ensaiar discurso', icon: '🪞', description: 'Treina Carisma diante do espelho.', duration: 45, effects: { social: 12, fun: 6 }, skill: { key: 'charisma', amount: 24 }, target: 'object', pose: 'stand', need: 'social' },
  useComputer: { id: 'useComputer', label: 'Usar computador', icon: '💻', description: 'Pesquisa, trabalho e diversão digital.', duration: 60, effects: { fun: 22, energy: -4 }, skill: { key: 'logic', amount: 18 }, counter: 'logic', target: 'object', pose: 'sit', need: 'fun' },
  socialize: { id: 'socialize', label: 'Conversar', icon: '💬', description: 'Uma boa conversa melhora o humor e a relação.', duration: 45, effects: { social: 52, fun: 20 }, mood: 6, counter: 'social', target: 'sim', pose: 'stand', need: 'social' },
  talk: { id: 'talk', label: 'Bater papo', icon: '🗣️', description: 'Uma conversa rápida.', duration: 25, effects: { social: 28, fun: 10 }, mood: 3, counter: 'social', target: 'sim', pose: 'stand', need: 'social' },
  garden: { id: 'garden', label: 'Cuidar do jardim', icon: '🌱', description: 'Cuidar das plantas é relaxante.', duration: 50, effects: { fun: 18, hygiene: -8 }, mood: 4, counter: 'garden', target: 'object', pose: 'clean', need: 'fun' },
  grill: { id: 'grill', label: 'Fazer churrasco', icon: '🔥', description: 'Cozinha ao ar livre.', duration: 40, effects: { hunger: 38, fun: 8 }, cost: 24, skill: { key: 'cooking', amount: 18 }, counter: 'cook', target: 'object', pose: 'stand', need: 'hunger' },
  sunbathe: { id: 'sunbathe', label: 'Tomar sol', icon: '🌞', description: 'Relaxar junto à piscina.', duration: 70, effects: { fun: 24, energy: 8, hygiene: -10 }, target: 'object', pose: 'lie', need: 'fun' },
  work: { id: 'work', label: 'Trabalhar', icon: '💼', description: 'Expediente: volta com salário e experiência.', duration: 240, effects: { energy: -18, hunger: -16, fun: -10, hygiene: -8 }, counter: 'work', target: 'none', pose: 'work', need: 'hunger' },
  study: { id: 'study', label: 'Estudar', icon: '📝', description: 'Aprofunda Lógica.', duration: 90, effects: { fun: -6, energy: -8 }, skill: { key: 'logic', amount: 36 }, counter: 'logic', target: 'object', pose: 'sit', need: 'fun' },
  clean: { id: 'clean', label: 'Limpar', icon: '🧽', description: 'Deixa tudo em ordem.', duration: 30, effects: { hygiene: 10, fun: -4 }, mood: 3, target: 'object', pose: 'clean', need: 'hygiene' },
  meditate: { id: 'meditate', label: 'Meditar', icon: '🧘', description: 'Respirar e recuperar o foco.', duration: 35, effects: { fun: 14, energy: 10 }, mood: 8, target: 'object', pose: 'sit', need: 'fun' },
};

export interface ObjectDef {
  id: string;
  name: string;
  category: string;
  price: number;
  footprint: [number, number];
  model: string;
  icon: string;
  description: string;
  interactions: ActivityType[];
  defaultColor: string;
  colors?: string[];
  layer?: 'floor' | 'wall' | 'surface';
  surface?: boolean;
  blocks?: boolean;
  outdoor?: boolean;
  comfort?: number;
  tags: string[];
}

export const CATEGORY_ORDER = ['Sala', 'Quarto', 'Cozinha', 'Banheiro', 'Escritório', 'Exterior', 'Decoração'];

const FABRIC_COLORS = ['#d8b08d', '#6f8494', '#8b6f64', '#c8c2b6', '#4f6b63', '#b8847b'];
const WOOD_COLORS = ['#a97345', '#d2a66f', '#6f4b36', '#e0c39b'];
const ACCENT_COLORS = ['#e8e2d8', '#2f3b44', '#d2a66f', '#8aa39a', '#c8796b'];

export const OBJECTS: ObjectDef[] = [
  // Sala de estar
  { id: 'sofa', name: 'Sofá Aurora', category: 'Sala', price: 1250, footprint: [2, 1], model: 'sofa', icon: '🛋️', description: 'Sofá de linho com almofadas macias e pés de madeira.', interactions: ['nap', 'socialize', 'read', 'meditate'], defaultColor: '#d8b08d', colors: FABRIC_COLORS, comfort: 8, tags: ['conforto', 'social'] },
  { id: 'armchair', name: 'Poltrona Leitura', category: 'Sala', price: 620, footprint: [1, 1], model: 'armchair', icon: '🪑', description: 'Poltrona estofada com braços arredondados.', interactions: ['read', 'nap', 'meditate'], defaultColor: '#6f8494', colors: FABRIC_COLORS, comfort: 6, tags: ['conforto'] },
  { id: 'coffeeTable', name: 'Mesa de Centro', category: 'Sala', price: 480, footprint: [2, 1], model: 'coffeeTable', icon: '▭', description: 'Tampo de madeira com detalhes em metal.', interactions: ['meditate'], defaultColor: '#a97345', colors: WOOD_COLORS, surface: true, tags: ['mesa'] },
  { id: 'tv', name: 'Smart TV 65"', category: 'Sala', price: 1890, footprint: [1, 1], model: 'tv', icon: '📺', description: 'Tela fina com imagem vibrante e modo ambiente.', interactions: ['watchTv', 'playGames'], defaultColor: '#2f3b44', tags: ['eletrônico', 'diversão'] },
  { id: 'bookshelf', name: 'Estante de Livros', category: 'Sala', price: 890, footprint: [1, 1], model: 'bookshelf', icon: '📚', description: 'Prateleiras com livros, vasos e objetos decorativos.', interactions: ['read', 'study'], defaultColor: '#8b6245', colors: WOOD_COLORS, tags: ['conhecimento'] },
  { id: 'stereo', name: 'Caixa de Som', category: 'Sala', price: 740, footprint: [1, 1], model: 'stereo', icon: '🔊', description: 'Som ambiente com acabamento em tecido.', interactions: ['practiceMusic'], defaultColor: '#3c4650', tags: ['música'] },
  { id: 'rug', name: 'Tapete Boho', category: 'Sala', price: 390, footprint: [3, 2], model: 'rug', icon: '🟫', description: 'Tapete tecido com padrão geométrico suave.', interactions: ['meditate'], defaultColor: '#c8b39a', colors: FABRIC_COLORS, layer: 'floor', blocks: false, comfort: 2, tags: ['decoração'] },
  { id: 'floorLamp', name: 'Luminária de Piso', category: 'Sala', price: 240, footprint: [1, 1], model: 'floorLamp', icon: '💡', description: 'Luz quente difusa com cúpula de linho.', interactions: [], defaultColor: '#e8dcc5', blocks: false, tags: ['iluminação'] },
  { id: 'plant', name: 'Planta Monstera', category: 'Sala', price: 180, footprint: [1, 1], model: 'plant', icon: '🪴', description: 'Folhagem tropical em vaso de cerâmica.', interactions: ['garden'], defaultColor: '#4f7b54', blocks: false, tags: ['natureza'] },
  { id: 'painting', name: 'Quadro Abstrato', category: 'Sala', price: 560, footprint: [1, 1], model: 'painting', icon: '🖼️', description: 'Arte abstrata com moldura fina.', interactions: ['meditate'], defaultColor: '#c8796b', colors: ACCENT_COLORS, layer: 'wall', blocks: false, tags: ['arte'] },
  { id: 'fireplace', name: 'Lareira Moderna', category: 'Sala', price: 2400, footprint: [2, 1], model: 'fireplace', icon: '🔥', description: 'Fogo aconchegante com revestimento em pedra.', interactions: ['socialize', 'meditate'], defaultColor: '#8a8177', comfort: 10, tags: ['aconchego'] },
  { id: 'diningTable', name: 'Mesa de Jantar', category: 'Sala', price: 1350, footprint: [2, 2], model: 'diningTable', icon: '🍽️', description: 'Mesa oval para seis lugares.', interactions: ['eat', 'socialize', 'study'], defaultColor: '#a97345', colors: WOOD_COLORS, surface: true, tags: ['refeição'] },
  { id: 'diningChair', name: 'Cadeira de Jantar', category: 'Sala', price: 290, footprint: [1, 1], model: 'diningChair', icon: '🪑', description: 'Cadeira estofada com estrutura de madeira.', interactions: [], defaultColor: '#c8c2b6', colors: FABRIC_COLORS, tags: ['assento'] },

  // Quarto
  { id: 'bedDouble', name: 'Cama Casal Nuvem', category: 'Quarto', price: 2200, footprint: [2, 2], model: 'bedDouble', icon: '🛏️', description: 'Cama king com cabeceira estofada e roupa de cama macia.', interactions: ['sleep', 'nap', 'socialize'], defaultColor: '#e5ddd0', colors: FABRIC_COLORS, comfort: 12, tags: ['descanso'] },
  { id: 'bedSingle', name: 'Cama Solteiro', category: 'Quarto', price: 1350, footprint: [1, 2], model: 'bedSingle', icon: '🛌', description: 'Cama compacta com gavetas.', interactions: ['sleep', 'nap'], defaultColor: '#a8bcc4', colors: FABRIC_COLORS, comfort: 9, tags: ['descanso'] },
  { id: 'nightstand', name: 'Mesa de Cabeceira', category: 'Quarto', price: 320, footprint: [1, 1], model: 'nightstand', icon: '🗄️', description: 'Criado-mudo com gaveta e luminária.', interactions: ['read'], defaultColor: '#a97345', colors: WOOD_COLORS, tags: ['armazenamento'] },
  { id: 'wardrobe', name: 'Guarda-roupa', category: 'Quarto', price: 1100, footprint: [2, 1], model: 'wardrobe', icon: '🚪', description: 'Armário amplo com portas ripadas.', interactions: [], defaultColor: '#d2a66f', colors: WOOD_COLORS, tags: ['armazenamento'] },
  { id: 'mirror', name: 'Espelho Alto', category: 'Quarto', price: 380, footprint: [1, 1], model: 'mirror', icon: '🪞', description: 'Espelho com moldura de metal escovado.', interactions: ['practiceCharisma', 'meditate'], defaultColor: '#c6b79c', tags: ['carisma'] },

  // Cozinha
  { id: 'fridge', name: 'Geladeira Inox', category: 'Cozinha', price: 2800, footprint: [1, 1], model: 'fridge', icon: '🧊', description: 'Geladeira french door com acabamento em aço.', interactions: ['quickMeal', 'cook', 'eat'], defaultColor: '#b9c0c4', tags: ['eletrodoméstico'] },
  { id: 'stove', name: 'Fogão de Indução', category: 'Cozinha', price: 1650, footprint: [1, 1], model: 'stove', icon: '🍳', description: 'Cooktop com forno embutido e panelas.', interactions: ['cook'], defaultColor: '#3c4650', tags: ['eletrodoméstico'] },
  { id: 'counter', name: 'Bancada de Cozinha', category: 'Cozinha', price: 780, footprint: [1, 1], model: 'counter', icon: '▤', description: 'Balcão com tampo de pedra e armários.', interactions: ['cook', 'clean'], defaultColor: '#e6e3dc', colors: ACCENT_COLORS, surface: true, tags: ['cozinha'] },
  { id: 'sink', name: 'Pia com Lava-louças', category: 'Cozinha', price: 690, footprint: [1, 1], model: 'sink', icon: '🚰', description: 'Cuba de inox e torneira alta.', interactions: ['washHands', 'clean'], defaultColor: '#b9c0c4', tags: ['cozinha'] },
  { id: 'kitchenIsland', name: 'Ilha Gourmet', category: 'Cozinha', price: 1450, footprint: [2, 1], model: 'kitchenIsland', icon: '🍽️', description: 'Ilha central com bancos e tampo de mármore.', interactions: ['cook', 'eat', 'socialize'], defaultColor: '#e6e3dc', colors: ACCENT_COLORS, surface: true, tags: ['cozinha', 'social'] },
  { id: 'microwave', name: 'Micro-ondas', category: 'Cozinha', price: 520, footprint: [1, 1], model: 'microwave', icon: '📻', description: 'Eletrodoméstico compacto de bancada.', interactions: ['quickMeal'], defaultColor: '#8e969b', layer: 'surface', blocks: false, tags: ['eletrodoméstico'] },
  { id: 'dishwasher', name: 'Máquina de Lavar Louça', category: 'Cozinha', price: 1180, footprint: [1, 1], model: 'dishwasher', icon: '🧽', description: 'Eletrodoméstico embutido.', interactions: ['clean'], defaultColor: '#b9c0c4', tags: ['eletrodoméstico'] },

  // Banheiro
  { id: 'toilet', name: 'Vaso Sanitário', category: 'Banheiro', price: 690, footprint: [1, 1], model: 'toilet', icon: '🚽', description: 'Louça branca com descarga dupla.', interactions: ['useToilet', 'read'], defaultColor: '#f2f1ed', tags: ['banheiro'] },
  { id: 'shower', name: 'Box de Vidro', category: 'Banheiro', price: 1480, footprint: [1, 1], model: 'shower', icon: '🚿', description: 'Chuveiro com box transparente e metais escuros.', interactions: ['shower'], defaultColor: '#cfe1e6', tags: ['banheiro'] },
  { id: 'bathtub', name: 'Banheira Oásis', category: 'Banheiro', price: 2150, footprint: [2, 1], model: 'bathtub', icon: '🛁', description: 'Banheira freestanding com torneira independente.', interactions: ['bath', 'meditate'], defaultColor: '#f2f1ed', comfort: 8, tags: ['banheiro'] },
  { id: 'sinkBasin', name: 'Lavatório', category: 'Banheiro', price: 480, footprint: [1, 1], model: 'sinkBasin', icon: '🧼', description: 'Cuba sobre bancada com espelho.', interactions: ['washHands', 'clean'], defaultColor: '#e6e3dc', tags: ['banheiro'] },

  // Escritório
  { id: 'desk', name: 'Mesa de Trabalho', category: 'Escritório', price: 980, footprint: [2, 1], model: 'desk', icon: '🖥️', description: 'Mesa ampla com gavetas e passagem de cabos.', interactions: ['study', 'useComputer', 'work'], defaultColor: '#a97345', colors: WOOD_COLORS, surface: true, tags: ['trabalho'] },
  { id: 'officeChair', name: 'Cadeira Ergonômica', category: 'Escritório', price: 540, footprint: [1, 1], model: 'officeChair', icon: '💺', description: 'Cadeira giratória com apoio lombar.', interactions: [], defaultColor: '#3c4650', colors: FABRIC_COLORS, tags: ['trabalho'] },
  { id: 'computer', name: 'Computador', category: 'Escritório', price: 2250, footprint: [1, 1], model: 'computer', icon: '💻', description: 'Monitor ultrawide, teclado e torre silenciosa.', interactions: ['useComputer', 'playGames', 'study', 'work'], defaultColor: '#2f3b44', layer: 'surface', blocks: false, tags: ['tecnologia'] },
  { id: 'treadmill', name: 'Esteira Fitness', category: 'Escritório', price: 2900, footprint: [1, 2], model: 'treadmill', icon: '🏃', description: 'Esteira com painel digital.', interactions: ['workOut'], defaultColor: '#4a525a', tags: ['exercício'] },
  { id: 'easel', name: 'Cavalete e Tintas', category: 'Escritório', price: 760, footprint: [1, 1], model: 'easel', icon: '🎨', description: 'Cavalete com tela em progresso.', interactions: ['practiceArt'], defaultColor: '#c8796b', tags: ['arte'] },
  { id: 'guitar', name: 'Violão Acústico', category: 'Escritório', price: 890, footprint: [1, 1], model: 'guitar', icon: '🎸', description: 'Violão de madeira com estojo.', interactions: ['practiceMusic'], defaultColor: '#b47c4b', tags: ['música'] },

  // Exterior
  { id: 'lounger', name: 'Espreguiçadeira', category: 'Exterior', price: 620, footprint: [1, 2], model: 'lounger', icon: '🛌', description: 'Espreguiçadeira reclinável de madeira e tecido.', interactions: ['sunbathe', 'nap'], defaultColor: '#e5ddd0', outdoor: true, tags: ['piscina'] },
  { id: 'grill', name: 'Churrasqueira', category: 'Exterior', price: 980, footprint: [1, 1], model: 'grill', icon: '🔥', description: 'Grill a carvão com tampa.', interactions: ['grill', 'cook'], defaultColor: '#3c4650', outdoor: true, tags: ['comida'] },
  { id: 'bench', name: 'Banco de Jardim', category: 'Exterior', price: 460, footprint: [2, 1], model: 'bench', icon: '🪑', description: 'Banco de madeira com estrutura de ferro.', interactions: ['socialize', 'read'], defaultColor: '#a97345', outdoor: true, tags: ['jardim'] },
  { id: 'flowerBed', name: 'Canteiro Florido', category: 'Exterior', price: 260, footprint: [2, 1], model: 'flowerBed', icon: '🌺', description: 'Flores coloridas e folhagens.', interactions: ['garden'], defaultColor: '#c8796b', outdoor: true, blocks: false, tags: ['jardim'] },
  { id: 'bike', name: 'Bicicleta Urbana', category: 'Exterior', price: 1250, footprint: [1, 2], model: 'bike', icon: '🚲', description: 'Bicicleta para exercício e passeios.', interactions: ['workOut'], defaultColor: '#4f6b63', outdoor: true, tags: ['exercício'] },
  { id: 'umbrella', name: 'Guarda-sol', category: 'Exterior', price: 540, footprint: [2, 2], model: 'umbrella', icon: '⛱️', description: 'Sombra elegante para a área externa.', interactions: ['sunbathe'], defaultColor: '#e8dcc5', outdoor: true, blocks: false, tags: ['piscina'] },

  // Decoração
  { id: 'sculpture', name: 'Escultura de Cerâmica', category: 'Decoração', price: 720, footprint: [1, 1], model: 'sculpture', icon: '🏺', description: 'Peça decorativa em cerâmica fosca.', interactions: ['meditate'], defaultColor: '#c8b39a', blocks: false, tags: ['arte'] },
  { id: 'ceilingLamp', name: 'Pendente Dourado', category: 'Decoração', price: 390, footprint: [1, 1], model: 'ceilingLamp', icon: '💡', description: 'Pendente com luz quente difusa.', interactions: [], defaultColor: '#d2a66f', layer: 'wall', blocks: false, tags: ['iluminação'] },
  { id: 'sideTable', name: 'Mesa Lateral', category: 'Decoração', price: 280, footprint: [1, 1], model: 'sideTable', icon: '◯', description: 'Mesa redonda com tampo de mármore.', interactions: [], defaultColor: '#e6e3dc', surface: true, tags: ['mesa'] },
];

export const OBJECT_BY_ID: Record<string, ObjectDef> = Object.fromEntries(OBJECTS.map((o) => [o.id, o]));

export function getDef(id: string): ObjectDef {
  return OBJECT_BY_ID[id] ?? OBJECTS[0];
}

export function rotatedFootprint(def: ObjectDef, rotation: number): [number, number] {
  return rotation % 2 === 0 ? [def.footprint[0], def.footprint[1]] : [def.footprint[1], def.footprint[0]];
}

export interface TraitDef {
  id: string;
  name: string;
  icon: string;
  description: string;
  decay?: Partial<Record<NeedKey, number>>;
  skill?: Partial<Record<SkillKey, number>>;
  mood?: number;
  career?: number;
}

export const TRAITS: TraitDef[] = [
  { id: 'creative', name: 'Criativo', icon: '🎨', description: 'Aprende Criatividade 30% mais rápido e ganha mais diversão com arte.', skill: { creativity: 1.3 }, mood: 2 },
  { id: 'outgoing', name: 'Sociável', icon: '💬', description: 'Ganha Carisma mais rápido, mas sente mais falta de contato.', decay: { social: 1.25 }, skill: { charisma: 1.25 } },
  { id: 'homebody', name: 'Caseiro', icon: '🏡', description: 'A necessidade social cai mais devagar.', decay: { social: 0.7 }, mood: 2 },
  { id: 'foodie', name: 'Gourmet', icon: '🍳', description: 'Evolui Culinária mais rápido.', skill: { cooking: 1.35 } },
  { id: 'glutton', name: 'Glutão', icon: '🍕', description: 'Sente fome mais depressa.', decay: { hunger: 1.35 } },
  { id: 'athletic', name: 'Atlético', icon: '🏋️', description: 'Treina melhor e perde energia mais devagar.', decay: { energy: 0.85 }, skill: { fitness: 1.3 } },
  { id: 'lazy', name: 'Preguiçoso', icon: '💤', description: 'Perde energia um pouco mais rápido.', decay: { energy: 1.2 } },
  { id: 'genius', name: 'Gênio', icon: '🧠', description: 'Evolui Lógica com facilidade.', skill: { logic: 1.35 }, mood: 1 },
  { id: 'neat', name: 'Organizado', icon: '✨', description: 'Mantém a higiene por mais tempo.', decay: { hygiene: 0.75 }, mood: 2 },
  { id: 'ambitious', name: 'Ambicioso', icon: '🚀', description: 'Rende mais no trabalho e sobe de cargo mais fácil.', career: 1.2, mood: 1 },
  { id: 'romantic', name: 'Romântico', icon: '💞', description: 'Relações evoluem mais rápido.', mood: 2 },
  { id: 'active', name: 'Animado', icon: '⚡', description: 'Começa o dia com mais disposição.', decay: { energy: 0.9, fun: 0.9 }, mood: 3 },
];

export const TRAIT_BY_ID = Object.fromEntries(TRAITS.map((t) => [t.id, t]));

export interface AspirationDef {
  id: string;
  name: string;
  icon: string;
  description: string;
  counter: string;
  goal: number;
  unit: string;
  reward: number;
}

export const ASPIRATIONS: AspirationDef[] = [
  { id: 'chef', name: 'Chef da Casa', icon: '👩‍🍳', description: 'Prepare 6 refeições.', counter: 'cook', goal: 6, unit: 'refeições', reward: 1800 },
  { id: 'socialite', name: 'Alma da Festa', icon: '🎉', description: 'Converse 5 vezes com outros moradores.', counter: 'social', goal: 5, unit: 'conversas', reward: 1500 },
  { id: 'athlete', name: 'Vida Ativa', icon: '🏅', description: 'Complete 5 treinos.', counter: 'workout', goal: 5, unit: 'treinos', reward: 2000 },
  { id: 'artist', name: 'Mente Criativa', icon: '🎨', description: 'Pratique arte ou música 5 vezes.', counter: 'art', goal: 5, unit: 'práticas', reward: 1900 },
  { id: 'scholar', name: 'Sábio do Bairro', icon: '📚', description: 'Leia ou estude 6 vezes.', counter: 'logic', goal: 6, unit: 'sessões', reward: 1700 },
  { id: 'gardener', name: 'Mão Verde', icon: '🌿', description: 'Cuide do jardim 4 vezes.', counter: 'garden', goal: 4, unit: 'cuidados', reward: 1400 },
  { id: 'career', name: 'Carreira dos Sonhos', icon: '💼', description: 'Vá ao trabalho 4 vezes.', counter: 'work', goal: 4, unit: 'expedientes', reward: 2600 },
];

export const ASPIRATION_BY_ID = Object.fromEntries(ASPIRATIONS.map((a) => [a.id, a]));

export interface CareerDef {
  id: string;
  name: string;
  icon: string;
  description: string;
  baseSalary: number;
  skill: SkillKey;
  shiftStart: number;
  shiftEnd: number;
  levels: string[];
}

export const CAREERS: CareerDef[] = [
  { id: 'culinary', name: 'Chef de Cozinha', icon: '👩‍🍳', description: 'Culinária · turno 10h às 18h', baseSalary: 180, skill: 'cooking', shiftStart: 600, shiftEnd: 1080, levels: ['Auxiliar de cozinha', 'Cozinheiro', 'Chef de parte', 'Chef executivo', 'Estrela do bairro'] },
  { id: 'tech', name: 'Tecnologia', icon: '💻', description: 'Lógica · turno 09h às 17h', baseSalary: 240, skill: 'logic', shiftStart: 540, shiftEnd: 1020, levels: ['Estagiário', 'Desenvolvedor', 'Engenheiro', 'Tech lead', 'Diretor de produto'] },
  { id: 'arts', name: 'Artista', icon: '🎨', description: 'Criatividade · turno 11h às 19h', baseSalary: 170, skill: 'creativity', shiftStart: 660, shiftEnd: 1140, levels: ['Aprendiz', 'Ilustrador', 'Artista pleno', 'Diretor criativo', 'Nome em exposição'] },
  { id: 'fitness', name: 'Atleta', icon: '🏋️', description: 'Condicionamento · turno 08h às 16h', baseSalary: 200, skill: 'fitness', shiftStart: 480, shiftEnd: 960, levels: ['Iniciante', 'Treineiro', 'Personal trainer', 'Atleta', 'Campeão'] },
  { id: 'business', name: 'Executivo', icon: '💼', description: 'Carisma · turno 09h às 18h', baseSalary: 300, skill: 'charisma', shiftStart: 540, shiftEnd: 1080, levels: ['Analista', 'Coordenador', 'Gerente', 'Diretor', 'CEO'] },
  { id: 'science', name: 'Cientista', icon: '🔬', description: 'Lógica · turno 10h às 18h', baseSalary: 230, skill: 'logic', shiftStart: 600, shiftEnd: 1080, levels: ['Assistente', 'Pesquisador', 'Doutor', 'Líder de laboratório', 'Inventor'] },
  { id: 'creator', name: 'Criador de Conteúdo', icon: '🎥', description: 'Carisma · turno 12h às 20h', baseSalary: 210, skill: 'charisma', shiftStart: 720, shiftEnd: 1200, levels: ['Novo canal', 'Criador', 'Influenciador', 'Produtor', 'Estrela digital'] },
  { id: 'medicine', name: 'Medicina', icon: '🩺', description: 'Lógica · turno 07h às 15h', baseSalary: 280, skill: 'logic', shiftStart: 420, shiftEnd: 900, levels: ['Plantonista', 'Residente', 'Médico geral', 'Especialista', 'Chefe de clínica'] },
];

export const CAREER_BY_ID = Object.fromEntries(CAREERS.map((c) => [c.id, c]));

export interface AchievementDef {
  id: string;
  name: string;
  icon: string;
  description: string;
  check: (s: GameState) => boolean;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'first_meal', name: 'Primeira refeição', icon: '🍽️', description: 'Cozinhe ou coma pela primeira vez.', check: (s) => s.stats.meals >= 1 },
  { id: 'decorator', name: 'Decorador', icon: '🛋️', description: 'Coloque 10 objetos no lote.', check: (s) => s.stats.objectsPlaced >= 10 },
  { id: 'architect', name: 'Arquiteto', icon: '📐', description: 'Construa 20 paredes.', check: (s) => s.stats.wallsPlaced >= 20 },
  { id: 'skillful', name: 'Autodidata', icon: '📈', description: 'Suba 5 níveis de habilidade.', check: (s) => s.stats.skillUps >= 5 },
  { id: 'promoted', name: 'Promovido!', icon: '🚀', description: 'Receba a primeira promoção.', check: (s) => s.stats.promotions >= 1 },
  { id: 'week', name: 'Uma semana em Aurora', icon: '📅', description: 'Sobreviva 7 dias.', check: (s) => s.clock.day >= 8 },
  { id: 'tycoon', name: 'Magnata', icon: '💰', description: 'Acumule R$ 30.000.', check: (s) => s.money >= 30000 },
  { id: 'full_house', name: 'Casa cheia', icon: '👨‍👩‍👧', description: 'Tenha 6 moradores.', check: (s) => s.sims.length >= 6 },
  { id: 'all_weather', name: 'Todas as estações', icon: '🌦️', description: 'Jogue por 28 dias.', check: (s) => s.clock.day >= 29 },
  { id: 'first_skill', name: 'Primeiro talento', icon: '🌟', description: 'Suba seu primeiro nível de habilidade.', check: (s) => s.stats.skillUps >= 1 },
  { id: 'conversations', name: 'Boa companhia', icon: '💬', description: 'Complete 10 interações na casa.', check: (s) => s.stats.interactions >= 10 },
  { id: 'home_chef', name: 'Chef da família', icon: '🍲', description: 'Prepare ou sirva 10 refeições.', check: (s) => s.stats.meals >= 10 },
  { id: 'best_friends', name: 'Melhores amigos', icon: '💞', description: 'Alcance uma relação acima de 60 pontos.', check: (s) => s.sims.some((sim) => Object.values(sim.relationships).some((value) => value >= 60)) },
  { id: 'dreamer', name: 'Sonho realizado', icon: '🌠', description: 'Conclua uma aspiração.', check: (s) => s.sims.some((sim) => sim.aspirationDone) },
  { id: 'collector', name: 'Colecionador', icon: '🛋️', description: 'Tenha 60 objetos no lote.', check: (s) => s.lot.objects.length >= 60 },
  { id: 'big_family', name: 'Família grande', icon: '👨‍👩‍👧‍👦', description: 'More com pelo menos 4 moradores.', check: (s) => s.sims.length >= 4 },
  { id: 'estate', name: 'Patrimônio', icon: '🏘️', description: 'Acumule R$ 50.000.', check: (s) => s.money >= 50000 },
  { id: 'two_weeks', name: 'Duas semanas de histórias', icon: '🗓️', description: 'Viva até o décimo quinto dia.', check: (s) => s.clock.day >= 15 },
];

export const FLOOR_ORDER: FloorStyleId[] = ['wood', 'tile', 'marble', 'carpet', 'stone', 'deck', 'concrete', 'grass'];
export const WALL_ORDER: WallStyleId[] = ['stucco', 'brick', 'wood', 'accent', 'panel'];

export const SKIN_TONES = ['#f6d5b8', '#e8b995', '#d49a73', '#b87b55', '#965e42', '#6f402e', '#4b2c22'];
export const HAIR_COLORS = ['#2b211d', '#4a3025', '#7b4b2f', '#b9814d', '#d9b56e', '#8a8a8a', '#d9d4cc', '#6b3f52', '#3b5268'];
export const EYE_COLORS = ['#4b6b53', '#5b7d9a', '#6b4b3a', '#3b3430', '#758b6b'];
export const OUTFIT_COLORS = ['#e9e3d8', '#3f5963', '#c8796b', '#8aa39a', '#d2a66f', '#6f6b8a', '#4f6b63', '#b8847b', '#2f3b44'];
export const HAIR_STYLES: { id: AppearanceHairStyle; label: string }[] = [
  { id: 'short', label: 'Curto' },
  { id: 'wavy', label: 'Ondulado' },
  { id: 'long', label: 'Longo' },
  { id: 'bun', label: 'Coque' },
  { id: 'curly', label: 'Cacheado' },
  { id: 'fade', label: 'Degradê' },
];

type AppearanceHairStyle = 'short' | 'wavy' | 'bun' | 'curly' | 'fade' | 'long';
