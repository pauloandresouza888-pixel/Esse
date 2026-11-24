export const SAVE_VERSION = 3;

export type NeedKey = 'hunger' | 'energy' | 'hygiene' | 'fun' | 'social' | 'bladder';
export type SkillKey = 'cooking' | 'fitness' | 'logic' | 'charisma' | 'creativity';
export type GameMode = 'live' | 'build';
export type Speed = 0 | 1 | 2 | 4;
export type BuildTool = 'select' | 'place' | 'move' | 'wall' | 'floor' | 'room' | 'delete' | 'pipette';
export type WallAxis = 'h' | 'v';
export type WallKind = 'wall' | 'door' | 'window';
export type FloorStyleId = 'grass' | 'wood' | 'tile' | 'marble' | 'carpet' | 'concrete' | 'stone' | 'deck' | 'water';
export type WallStyleId = 'stucco' | 'brick' | 'wood' | 'accent' | 'panel';
export type Weather = 'clear' | 'cloudy' | 'rain' | 'storm';
export type Season = 'spring' | 'summer' | 'autumn' | 'winter';
export type Quality = 'low' | 'high';
export type CameraPreset = 'overview' | 'front' | 'garden' | 'top' | 'cinema';

export type ActivityType =
  | 'cook' | 'eat' | 'quickMeal' | 'sleep' | 'nap' | 'shower' | 'bath' | 'washHands' | 'useToilet'
  | 'watchTv' | 'read' | 'playGames' | 'workOut' | 'practiceArt' | 'practiceMusic' | 'practiceCharisma' | 'useComputer'
  | 'socialize' | 'talk' | 'garden' | 'grill' | 'sunbathe' | 'work' | 'study' | 'clean' | 'meditate';

export interface Appearance {
  skin: string;
  hair: string;
  hairStyle: 'short' | 'wavy' | 'bun' | 'curly' | 'fade' | 'long';
  eyes: string;
  top: string;
  bottom: string;
  shoes: string;
  height: number;
  build: number;
  freckles: boolean;
  glasses: boolean;
}

export type Needs = Record<NeedKey, number>;
export type Skills = Record<SkillKey, number>;
export type Counters = Record<string, number>;

export interface Job {
  careerId: string;
  level: number;
  shiftStart: number;
  shiftEnd: number;
  lastWorkDay: number;
  performance: number;
}

export interface Activity {
  uid: string;
  type: ActivityType;
  label: string;
  duration: number;
  remaining: number;
  effects: Partial<Needs>;
  targetId?: string;
  targetSimId?: string;
  skill?: { key: SkillKey; amount: number };
  money?: number;
  mood?: number;
  counter?: string;
  pose?: 'stand' | 'sit' | 'lie' | 'exercise' | 'clean' | 'work';
}

export interface PendingCommand {
  interactionId: ActivityType;
  targetId?: string;
  targetSimId?: string;
}

export interface Sim {
  id: string;
  name: string;
  pronoun: 'ela' | 'ele' | 'elu';
  appearance: Appearance;
  traits: string[];
  aspirationId: string;
  aspirationDone: boolean;
  needs: Needs;
  skills: Skills;
  skillXp: Skills;
  mood: number;
  job: Job | null;
  position: { x: number; z: number };
  facing: number;
  path?: { x: number; z: number }[];
  pathIndex: number;
  pending?: PendingCommand;
  activity: Activity | null;
  relationships: Record<string, number>;
  counters: Counters;
  atWork: boolean;
  autonomyCooldown: number;
}

export interface FurnitureObject {
  id: string;
  defId: string;
  x: number;
  z: number;
  rotation: 0 | 1 | 2 | 3;
  color?: string;
  variant?: number;
}

export interface Wall {
  id: string;
  key: string;
  x: number;
  z: number;
  axis: WallAxis;
  kind: WallKind;
  style: WallStyleId;
}

export interface Room {
  id: string;
  name: string;
  x: number;
  z: number;
  w: number;
  d: number;
  floor: FloorStyleId;
}

export interface Lot {
  width: number;
  depth: number;
  floors: Record<string, FloorStyleId>;
  walls: Record<string, Wall>;
  objects: FurnitureObject[];
  rooms: Room[];
}

export interface BuildState {
  tool: BuildTool;
  selectedDefId: string | null;
  selectedObjectId: string | null;
  rotation: 0 | 1 | 2 | 3;
  floorStyle: FloorStyleId;
  wallStyle: WallStyleId;
  wallKind: WallKind | 'erase';
  brushSize: 1 | 2 | 3;
  strokeActive: boolean;
  roomStart: { x: number; z: number } | null;
  roomEnd: { x: number; z: number } | null;
}

export interface Toast {
  id: string;
  title: string;
  message: string;
  tone: 'info' | 'success' | 'warning' | 'error';
  icon: string;
  createdAt: number;
}

export interface Settings {
  sound: boolean;
  shadows: boolean;
  quality: Quality;
  showGrid: boolean;
  showRoof: boolean;
  showLabels: boolean;
  autosave: boolean;
  minutesPerSecond: number;
}

export interface UIState {
  showSplash: boolean;
  showCAS: boolean;
  casTargetId: string | null;
  showSaves: boolean;
  showSettings: boolean;
  showHelp: boolean;
  showAchievements: boolean;
  showCareers: boolean;
  photoMode: boolean;
  tutorialStep: number;
  toasts: Toast[];
  log: string[];
  cameraPreset: CameraPreset;
  cameraNonce: number;
  focusSimId: string | null;
  focusNonce: number;
}

export interface GameState {
  version: number;
  started: boolean;
  householdName: string;
  mode: GameMode;
  speed: Speed;
  clock: { day: number; minutes: number; season: Season };
  weather: Weather;
  weatherMinutes: number;
  money: number;
  lot: Lot;
  sims: Sim[];
  activeSimId: string;
  selectedObjectId: string | null;
  hoverTile: { x: number; z: number } | null;
  build: BuildState;
  ui: UIState;
  settings: Settings;
  achievements: string[];
  stats: {
    meals: number;
    interactions: number;
    objectsPlaced: number;
    wallsPlaced: number;
    promotions: number;
    skillUps: number;
    daysPlayed: number;
    earned: number;
    spent: number;
  };
  lastBillDay: number;
  lastAutosaveAt: number;
  history: LotSnapshot[];
  future: LotSnapshot[];
}

export interface LotSnapshot {
  lot: Lot;
  money: number;
}

export interface WorldSnapshot {
  version: number;
  timestamp: number;
  householdName: string;
  mode: GameMode;
  speed: Speed;
  clock: GameState['clock'];
  weather: Weather;
  weatherMinutes: number;
  money: number;
  lot: Lot;
  sims: Sim[];
  activeSimId: string;
  settings: Settings;
  achievements: string[];
  stats: GameState['stats'];
  lastBillDay: number;
}

export interface SaveSlot {
  version: number;
  timestamp: number;
  label: string;
  householdName: string;
  day: number;
  money: number;
  simCount: number;
  snapshot: WorldSnapshot;
}
