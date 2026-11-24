import {
  ACHIEVEMENTS, ASPIRATION_BY_ID, CAREER_BY_ID, INTERACTIONS, OBJECTS, getDef, TRAIT_BY_ID,
} from './data';
import {
  MINUTES_PER_DAY, NEED_KEYS, SKILL_META, WEATHER_META, clamp, deepCopy, seasonFromDay, uid,
} from './constants';
import { findObject, objectCenterTile } from './lot';
import { findBestStandTile, findClosestObjectTile, findPath, findSocialTile, nearestWalkable, type Tile } from './pathfinding';
import type {
  Activity, ActivityType, GameState, NeedKey, PendingCommand, Sim, Sim as SimType, SkillKey, Weather,
} from './types';
import type { SoundKind } from './engine/audio';

export interface SimEvent {
  title: string;
  message: string;
  tone: 'info' | 'success' | 'warning' | 'error';
  icon: string;
  sound?: SoundKind;
}

interface Ctx {
  state: GameState;
  events: SimEvent[];
  money: { value: number };
  stats: GameState['stats'];
  achievements: string[];
  relationships: Array<{ from: string; to: string; amount: number }>;
}

export interface PreparedInteraction {
  ok: boolean;
  error?: string;
  path: Tile[];
  pending?: PendingCommand;
}

function traitDecay(sim: Sim, key: NeedKey) {
  return sim.traits.reduce((mult, id) => mult * (TRAIT_BY_ID[id]?.decay?.[key] ?? 1), 1);
}

function traitSkill(sim: Sim, key: SkillKey) {
  return sim.traits.reduce((mult, id) => mult * (TRAIT_BY_ID[id]?.skill?.[key] ?? 1), 1);
}

function traitMoodBonus(sim: Sim) {
  return sim.traits.reduce((sum, id) => sum + (TRAIT_BY_ID[id]?.mood ?? 0), 0);
}

function traitCareer(sim: Sim) {
  return sim.traits.reduce((mult, id) => mult * (TRAIT_BY_ID[id]?.career ?? 1), 1);
}

function event(title: string, message: string, tone: SimEvent['tone'] = 'info', icon = '✨', sound?: SoundKind): SimEvent {
  return { title, message, tone, icon, sound };
}

function nextWeather(season: GameState['clock']['season']): Weather {
  const r = Math.random();
  const table: Record<GameState['clock']['season'], Array<[Weather, number]>> = {
    spring: [['clear', 0.46], ['cloudy', 0.28], ['rain', 0.2], ['storm', 0.06]],
    summer: [['clear', 0.62], ['cloudy', 0.22], ['rain', 0.12], ['storm', 0.04]],
    autumn: [['clear', 0.4], ['cloudy', 0.32], ['rain', 0.22], ['storm', 0.06]],
    winter: [['clear', 0.34], ['cloudy', 0.32], ['rain', 0.26], ['storm', 0.08]],
  };
  let acc = 0;
  for (const [weather, weight] of table[season]) {
    acc += weight;
    if (r <= acc) return weather;
  }
  return 'clear';
}

export function prepareInteraction(
  state: GameState, sim: Sim, interactionId: ActivityType,
  targetId?: string, targetSimId?: string,
): PreparedInteraction {
  const template = INTERACTIONS[interactionId];
  if (!template) return { ok: false, error: 'Interação desconhecida.', path: [] };
  if (sim.activity || sim.pending) return { ok: false, error: `${sim.name} já está ocupado.`, path: [] };
  if (template.cost && state.money < template.cost) return { ok: false, error: 'Saldo insuficiente para esta ação.', path: [] };

  let resolvedTargetId = targetId;
  let resolvedSimId = targetSimId;

  if (template.target === 'sim') {
    if (!resolvedSimId) {
      const others = state.sims.filter((s) => s.id !== sim.id && !s.atWork && !s.activity);
      if (!others.length) return { ok: false, error: 'Ninguém disponível para conversar.', path: [] };
      others.sort((a, b) => (sim.relationships[b.id] ?? 0) - (sim.relationships[a.id] ?? 0));
      resolvedSimId = others[0].id;
    }
    const other = state.sims.find((s) => s.id === resolvedSimId);
    if (!other || other.atWork) return { ok: false, error: 'Esse morador não está disponível.', path: [] };
    const result = findSocialTile(state.lot, sim.position, other.position);
    if (!result) return { ok: false, error: 'Não há caminho até o morador.', path: [] };
    return { ok: true, path: result.path, pending: { interactionId, targetSimId: resolvedSimId } };
  }

  if (template.target === 'object') {
    if (!resolvedTargetId) {
      const defIds = OBJECTS.filter((def) => def.interactions.includes(interactionId)).map((def) => def.id);
      const result = findClosestObjectTile(state.lot, sim.position, defIds);
      if (!result) return { ok: false, error: `Nenhum objeto disponível para ${template.label.toLowerCase()}.`, path: [] };
      resolvedTargetId = result.objectId;
    }
    const result = findBestStandTile(state.lot, sim.position, resolvedTargetId);
    if (!result) return { ok: false, error: 'Não há caminho até esse objeto.', path: [] };
    return { ok: true, path: result.path, pending: { interactionId, targetId: resolvedTargetId } };
  }

  return { ok: true, path: [], pending: { interactionId } };
}

export function beginActivity(sim: Sim, pending: PendingCommand, ctx: Ctx): Sim {
  const template = INTERACTIONS[pending.interactionId];
  if (!template) return sim;
  if (template.cost) {
    if (ctx.money.value < template.cost) {
      ctx.events.push(event('Sem dinheiro', 'Não foi possível iniciar esta ação.', 'warning', '💸', 'error'));
      sim.pending = undefined;
      sim.path = [];
      sim.pathIndex = 0;
      return sim;
    }
    ctx.money.value -= template.cost;
    ctx.stats.spent += template.cost;
  }
  const activity: Activity = {
    uid: uid('act'),
    type: template.id,
    label: template.label,
    duration: template.duration,
    remaining: template.duration,
    effects: { ...template.effects },
    targetId: pending.targetId,
    targetSimId: pending.targetSimId,
    skill: template.skill ? { ...template.skill } : undefined,
    mood: template.mood,
    counter: template.counter,
    pose: template.pose,
  };
  if ((template.pose === 'sit' || template.pose === 'lie') && pending.targetId) {
    const object = findObject(ctx.state.lot, pending.targetId);
    if (object) {
      const center = objectCenterTile(object);
      sim.position = { x: center.x, z: center.z };
    }
  }
  sim.activity = activity;
  sim.pending = undefined;
  sim.path = [];
  sim.pathIndex = 0;
  sim.autonomyCooldown = 18;
  if (template.id === 'cook' || template.id === 'quickMeal' || template.id === 'eat' || template.id === 'grill') {
    ctx.stats.meals += 1;
  }
  if (template.id === 'work') ctx.events.push(event('Expediente iniciado', `${sim.name} começou a trabalhar.`, 'info', '💼', 'work'));
  return sim;
}

export function beginWork(sim: Sim, state: GameState): { sim: Sim; evt: SimEvent } | null {
  if (!sim.job || sim.atWork || sim.activity || sim.pending) return null;
  const template = INTERACTIONS.work;
  const next: Sim = {
    ...sim,
    job: { ...sim.job, lastWorkDay: state.clock.day },
    atWork: true,
    activity: {
      uid: uid('work'), type: 'work', label: template.label, duration: template.duration,
      remaining: template.duration, effects: { ...template.effects }, pose: 'work', counter: 'work',
    },
    path: [], pathIndex: 0, pending: undefined, autonomyCooldown: 30,
  };
  return { sim: next, evt: event('Hora do trabalho', `${sim.name} saiu para o expediente.`, 'info', '💼', 'work') };
}

function completeActivity(sim: Sim, activity: Activity, ctx: Ctx) {
  const template = INTERACTIONS[activity.type];
  ctx.stats.interactions += 1;
  if (activity.skill) {
    const key = activity.skill.key;
    const amount = activity.skill.amount * traitSkill(sim, key);
    sim.skillXp = { ...sim.skillXp, [key]: (sim.skillXp[key] ?? 0) + amount };
    while (sim.skillXp[key] >= 100 && sim.skills[key] < 10) {
      sim.skillXp[key] -= 100;
      sim.skills = { ...sim.skills, [key]: sim.skills[key] + 1 };
      ctx.stats.skillUps += 1;
      sim.mood = clamp(sim.mood + 4, 0, 100);
      ctx.events.push(event('Habilidade evoluída', `${sim.name} alcançou nível ${sim.skills[key]} em ${SKILL_META[key].label}.`, 'success', SKILL_META[key].icon, 'level'));
    }
  }

  if (activity.counter) {
    sim.counters = { ...sim.counters, [activity.counter]: (sim.counters[activity.counter] ?? 0) + 1 };
    const aspiration = ASPIRATION_BY_ID[sim.aspirationId];
    if (aspiration && !sim.aspirationDone && aspiration.counter === activity.counter && sim.counters[activity.counter] >= aspiration.goal) {
      sim.aspirationDone = true;
      ctx.money.value += aspiration.reward;
      ctx.stats.earned += aspiration.reward;
      sim.mood = clamp(sim.mood + 18, 0, 100);
      ctx.events.push(event('Aspiração concluída!', `${sim.name} concluiu “${aspiration.name}” e recebeu ${aspiration.reward} em bônus.`, 'success', aspiration.icon, 'success'));
    }
  }

  if (activity.type === 'work' && sim.job) {
    const career = CAREER_BY_ID[sim.job.careerId];
    if (career) {
      const skillLevel = sim.skills[career.skill] ?? 1;
      const performance = sim.job.performance / 100;
      const salary = Math.round(career.baseSalary * sim.job.level * (1 + skillLevel * 0.11) * (0.85 + sim.mood / 260) * (0.85 + performance * 0.3) * traitCareer(sim));
      ctx.money.value += salary;
      ctx.stats.earned += salary;
      sim.job = { ...sim.job, performance: clamp(sim.job.performance + (sim.mood > 60 ? 9 : 3), 0, 100) };
      sim.atWork = false;
      sim.mood = clamp(sim.mood + 3, 0, 100);
      ctx.events.push(event('Salário recebido', `${sim.name} voltou do trabalho com R$ ${salary.toLocaleString('pt-BR')}.`, 'success', '💰', 'coin'));
      const promotionScore = skillLevel + performance * 2 + (sim.mood > 70 ? 1 : 0) + (sim.traits.includes('ambitious') ? 1 : 0);
      if (sim.job.level < 5 && promotionScore >= sim.job.level + 3) {
        sim.job.level += 1;
        ctx.stats.promotions += 1;
        sim.mood = clamp(sim.mood + 10, 0, 100);
        ctx.events.push(event('Promoção!', `${sim.name} agora é ${career.levels[sim.job.level - 1]}.`, 'success', '🚀', 'success'));
      }
    }
  }

  if (activity.targetSimId && (activity.type === 'socialize' || activity.type === 'talk')) {
    const base = activity.type === 'socialize' ? 9 : 5;
    const bonus = sim.traits.includes('romantic') ? 1.4 : 1;
    ctx.relationships.push({ from: sim.id, to: activity.targetSimId, amount: base * bonus });
    ctx.relationships.push({ from: activity.targetSimId, to: sim.id, amount: base * bonus });
  }

  if (activity.mood) sim.mood = clamp(sim.mood + activity.mood, 0, 100);
  sim.activity = null;
  sim.atWork = false;
  sim.autonomyCooldown = 6 + Math.random() * 8;
  void template;
}

function applyRelationships(sims: Sim[], deltas: Ctx['relationships']) {
  deltas.forEach(({ from, to, amount }) => {
    const sim = sims.find((s) => s.id === from);
    if (!sim) return;
    sim.relationships = { ...sim.relationships, [to]: clamp((sim.relationships[to] ?? 20) + amount, -100, 100) };
  });
}

function chooseAutonomy(sim: Sim, ctx: Ctx) {
  const state = ctx.state;
  // Trabalho no horário do expediente.
  if (sim.job && !sim.atWork && sim.job.lastWorkDay !== state.clock.day && !sim.activity && !sim.pending) {
    const { shiftStart } = sim.job;
    if (state.clock.minutes >= shiftStart && state.clock.minutes < shiftStart + 90 && sim.mood > 28) {
      const work = beginWork(sim, state);
      if (work) {
        Object.assign(sim, work.sim);
        ctx.events.push(work.evt);
        return;
      }
    }
  }

  // Um objeto evita o estreitamento prematuro do TypeScript para o valor inicial.
  let scan: { key: NeedKey; value: number } = { key: 'hunger', value: Infinity };
  for (const key of NEED_KEYS) {
    if (sim.needs[key] < scan.value) scan = { key, value: sim.needs[key] };
  }
  const lowest = scan.key;
  if (scan.value > 62) return;

  if (lowest === 'social') {
    const others = state.sims.filter((s) => s.id !== sim.id && !s.atWork && !s.activity);
    if (others.length) {
      const prepared = prepareInteraction(state, sim, 'socialize', undefined, others[0].id);
      if (prepared.ok && prepared.pending) {
        setCommand(sim, prepared.pending, prepared.path, ctx);
        return;
      }
    }
  }

  const templates = Object.values(INTERACTIONS).filter((t) => t.need === lowest && t.target === 'object');
  const defIds = OBJECTS.filter((def) => def.interactions.some((id) => templates.some((t) => t.id === id))).map((def) => def.id);
  const closest = findClosestObjectTile(state.lot, sim.position, defIds);
  if (closest) {
    const object = findObject(state.lot, closest.objectId);
    if (object) {
      const def = getDef(object.defId);
      const candidates = def.interactions.filter((id) => templates.some((t) => t.id === id));
      candidates.sort((a, b) => (INTERACTIONS[b].effects[lowest] ?? 0) - (INTERACTIONS[a].effects[lowest] ?? 0));
      const interactionId = candidates[0];
      if (interactionId) {
        setCommand(sim, { interactionId, targetId: object.id }, closest.path, ctx);
        return;
      }
    }
  }

  // Fallback: uma ação calmante sem alvo.
  const fallback: ActivityType = lowest === 'energy' ? 'nap' : lowest === 'hunger' ? 'quickMeal' : lowest === 'bladder' ? 'useToilet' : 'meditate';
  const prepared = prepareInteraction(state, sim, fallback);
  if (prepared.ok && prepared.pending) setCommand(sim, prepared.pending, prepared.path, ctx);
}

function setCommand(sim: Sim, pending: PendingCommand, path: Tile[], ctx: Ctx) {
  sim.pending = pending;
  sim.path = path;
  sim.pathIndex = path.length > 1 ? 1 : path.length;
  if (sim.pathIndex >= sim.path.length) beginActivity(sim, pending, ctx);
}

function stepSim(sim: Sim, dtReal: number, gameMinutes: number, speed: number, ctx: Ctx) {
  const state = ctx.state;
  const isWorking = sim.activity?.type === 'work' || sim.atWork;
  const isSleeping = sim.activity?.type === 'sleep' || sim.activity?.type === 'nap';

  // Decaimento das necessidades.
  const base: Record<NeedKey, number> = { hunger: 0.075, energy: 0.055, hygiene: 0.035, fun: 0.055, social: 0.045, bladder: 0.065 };
  const needs = { ...sim.needs };
  NEED_KEYS.forEach((key) => {
    if (isWorking) return;
    if (key === 'energy' && isSleeping) return;
    needs[key] = clamp(needs[key] - base[key] * traitDecay(sim, key) * gameMinutes, 0, 100);
  });
  sim.needs = needs;

  // Comandos sem deslocamento começam imediatamente.
  if (!sim.activity && sim.pending && (!sim.path || sim.path.length === 0 || sim.pathIndex >= sim.path.length)) {
    beginActivity(sim, sim.pending, ctx);
  }

  // Movimento pelo caminho.
  if (!sim.activity && sim.path && sim.pathIndex < sim.path.length) {
    const target = sim.path[sim.pathIndex];
    const dx = target.x - sim.position.x;
    const dz = target.z - sim.position.z;
    const distance = Math.hypot(dx, dz);
    const step = dtReal * speed * 1.18;
    if (distance <= step || distance < 0.001) {
      sim.position = { x: target.x, z: target.z };
      sim.pathIndex += 1;
    } else {
      sim.position = { x: sim.position.x + (dx / distance) * step, z: sim.position.z + (dz / distance) * step };
      sim.facing = Math.atan2(dx, dz);
    }
    if (sim.pathIndex >= sim.path.length) {
      sim.path = [];
      sim.pathIndex = 0;
      if (sim.pending) beginActivity(sim, sim.pending, ctx);
    }
  }

  // Progresso da atividade.
  if (sim.activity) {
    const activity = { ...sim.activity };
    const used = Math.min(gameMinutes, activity.remaining);
    if (used > 0) {
      (Object.keys(activity.effects) as NeedKey[]).forEach((key) => {
        sim.needs = { ...sim.needs, [key]: clamp(sim.needs[key] + (activity.effects[key] ?? 0) * (used / activity.duration), 0, 100) };
      });
      activity.remaining -= used;
    }
    sim.activity = activity;
    if (activity.remaining <= 0.001) completeActivity(sim, activity, ctx);
  }

  // Humor acompanha necessidades, traços e conquistas.
  const average = NEED_KEYS.reduce((sum, key) => sum + sim.needs[key], 0) / NEED_KEYS.length;
  const targetMood = clamp(average * 0.62 + 28 + traitMoodBonus(sim) + (sim.aspirationDone ? 5 : 0) + (sim.activity?.mood ?? 0), 0, 100);
  sim.mood = clamp(sim.mood + (targetMood - sim.mood) * Math.min(1, gameMinutes / 26), 0, 100);

  // Decisão autônoma.
  if (!sim.activity && !sim.pending && (!sim.path || sim.path.length === 0)) {
    sim.autonomyCooldown -= gameMinutes;
    if (sim.autonomyCooldown <= 0) {
      sim.autonomyCooldown = 14 + Math.random() * 22;
      chooseAutonomy(sim, ctx);
    }
  }
}

export function checkAchievements(state: GameState, current: string[]): { achievements: string[]; events: SimEvent[] } {
  const achievements = [...current];
  const events: SimEvent[] = [];
  ACHIEVEMENTS.forEach((achievement) => {
    if (achievements.includes(achievement.id)) return;
    let unlocked = false;
    try { unlocked = achievement.check(state); } catch { unlocked = false; }
    if (unlocked) {
      achievements.push(achievement.id);
      events.push(event('Conquista desbloqueada', `${achievement.icon} ${achievement.name} — ${achievement.description}`, 'success', '🏆', 'success'));
    }
  });
  return { achievements, events };
}

export function simulate(state: GameState, dtReal: number): { patch: Partial<GameState>; events: SimEvent[] } {
  const speed = state.speed;
  const gameMinutes = dtReal * speed * state.settings.minutesPerSecond;
  const events: SimEvent[] = [];
  const ctx: Ctx = {
    state,
    events,
    money: { value: state.money },
    stats: deepCopy(state.stats),
    achievements: [...state.achievements],
    relationships: [],
  };

  let day = state.clock.day;
  const previousMinutes = state.clock.minutes;
  let minutes = previousMinutes + gameMinutes;
  while (minutes >= MINUTES_PER_DAY) {
    minutes -= MINUTES_PER_DAY;
    day += 1;
    events.push(event('Um novo dia em Aurora', `Dia ${day} começou. As contas e a rotina continuam.`, 'info', '🌅'));
  }
  const season = seasonFromDay(day);
  ctx.stats.daysPlayed = day - 1;

  // Contas a cada três dias, às 08:00.
  let lastBillDay = state.lastBillDay;
  if (day % 3 === 1 && day !== lastBillDay && previousMinutes < 480 && minutes >= 480) {
    const bill = Math.round(220 + state.lot.objects.length * 11 + Object.keys(state.lot.walls).length * 3);
    ctx.money.value -= bill;
    ctx.stats.spent += bill;
    lastBillDay = day;
    events.push(event('Contas da casa', `Foram pagos R$ ${bill.toLocaleString('pt-BR')} em manutenção.`, 'warning', '🧾', 'coin'));
  }

  // Clima.
  let weather = state.weather;
  let weatherMinutes = state.weatherMinutes - gameMinutes;
  if (weatherMinutes <= 0) {
    weather = nextWeather(season);
    weatherMinutes = 180 + Math.random() * 320;
    events.push(event('O tempo mudou', `${WEATHER_META[weather].icon} Agora: ${WEATHER_META[weather].label}.`, 'info', WEATHER_META[weather].icon, weather === 'storm' ? 'thunder' : undefined));
  }

  const sims = deepCopy(state.sims) as SimType[];
  sims.forEach((sim) => stepSim(sim, dtReal, gameMinutes, speed, ctx));
  applyRelationships(sims, ctx.relationships);

  const patch: Partial<GameState> = {
    clock: { day, minutes, season },
    weather,
    weatherMinutes,
    money: ctx.money.value,
    sims,
    stats: ctx.stats,
    achievements: ctx.achievements,
    lastBillDay,
  };

  const merged: GameState = { ...state, ...patch };
  const achievementResult = checkAchievements(merged, ctx.achievements);
  patch.achievements = achievementResult.achievements;
  events.push(...achievementResult.events);

  return { patch, events };
}

export function findPathForMove(state: GameState, sim: Sim, tile: Tile): Tile[] | null {
  const target = nearestWalkable(state.lot, tile.x, tile.z) ?? tile;
  return findPath(state.lot, sim.position, target);
}
