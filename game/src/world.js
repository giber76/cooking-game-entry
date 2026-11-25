// Sizzle & Serve — world: the kitchen state and every rule that changes it.
// The renderer only ever reads this state; nothing here touches the canvas.
import {
  CHOP_SECONDS, GRILL_SECONDS, BURN_SECONDS, ORDER_PATIENCE, ORDER_SPAWN_SECONDS,
  MAX_ORDERS, START_HEARTS, DAY_SECONDS, PLAYER, RECIPES, RECIPE_IDS, STATIONS,
} from './config.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_OVER = 'over';

/** An item in hands, on a station slot, or on a plate. */
export function makeItem(id) {
  return { id, progress: 0, state: 'raw' }; // state: raw | chopping | chopped | grilling | cooked | burnt
}

export function itemName(id) {
  if (id === 'pattyCooked') return 'Grilled Patty';
  if (id === 'pattyBurnt') return 'Burnt Patty';
  if (id.endsWith('Chopped')) return 'Chopped ' + id.slice(0, -7).replace(/^./, (c) => c.toUpperCase());
  return id.replace(/^./, (c) => c.toUpperCase());
}

let orderSeq = 0;

export function makeOrder(recipeId, level) {
  orderSeq += 1;
  const patience = Math.max(32, ORDER_PATIENCE - (level - 1) * 4);
  return { id: orderSeq, recipeId, patience, maxPatience: patience, born: 0 };
}

export class World {
  constructor(seed) {
    this.seed = seed || 1;
    this.random = mulberry32(this.seed);
    this.screen = SCREEN_TITLE;
    this.time = 0; // seconds since the day started
    this.dayLeft = DAY_SECONDS;
    this.coins = 0;
    this.served = 0;
    this.failed = 0;
    this.hearts = START_HEARTS;
    this.combo = 0;
    this.bestCombo = 0;
    this.level = 1;
    this.orders = [];
    this.spawnTimer = 4;
    this.chef = { x: 640, y: 700, vx: 0, vy: 0, facing: 1, moving: false, held: null, chopTarget: null };
    this.slots = {}; // stationId -> array of slot items (null when empty)
    for (const [id, st] of Object.entries(STATIONS)) {
      if (st.slots) this.slots[id] = new Array(st.slots).fill(null);
    }
    this.particles = [];
    this.floaters = [];
    this.flash = null; // { text, color, until }
    this.rush = false;
    this.events = [];
  }

  reset() {
    const seed = this.seed;
    const fresh = new World(seed);
    Object.assign(this, fresh);
  }

  startDay() {
    this.reset();
    this.screen = SCREEN_PLAY;
    this.spawnOrder();
    this.spawnOrder();
  }

  availableRecipes() {
    return RECIPE_IDS.filter((id) => RECIPES[id].minLevel <= this.level);
  }

  spawnOrder() {
    if (this.orders.length >= MAX_ORDERS) return;
    const pool = this.availableRecipes();
    const recipeId = pool[Math.floor(this.random() * pool.length)];
    this.orders.push(makeOrder(recipeId, this.level));
  }

  /** Advance the simulation by dt seconds. `held` is true while the player holds E. */
  step(dt, held) {
    if (this.screen !== SCREEN_PLAY) return;
    this.time += dt;
    this.dayLeft -= dt;
    if (this.dayLeft <= 0) {
      this.dayLeft = 0;
      this.screen = SCREEN_OVER;
      this.events.push('dayOver');
      return;
    }
    this.rush = this.dayLeft <= 30;
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      this.spawnOrder();
      this.spawnTimer = Math.max(6, ORDER_SPAWN_SECONDS - this.level * 0.8);
    }
    for (let i = this.orders.length - 1; i >= 0; i -= 1) {
      const order = this.orders[i];
      order.patience -= dt;
      if (order.patience <= 0) {
        this.orders.splice(i, 1);
        this.failed += 1;
        this.combo = 0;
        this.hearts -= 1;
        this.floaters.push({ x: 640, y: 150, text: 'ORDER LOST!', color: '#ff5a4e', ttl: 1.6 });
        this.events.push('orderLost');
        if (this.hearts <= 0) {
          this.screen = SCREEN_OVER;
          this.events.push('gameOver');
          return;
        }
      }
    }
    // Grill timers: cook, then burn.
    for (const slot of this.slots.grill) {
      if (!slot) continue;
      slot.progress += dt;
      if (slot.state === 'grilling' && slot.progress >= GRILL_SECONDS) {
        slot.state = 'cooked';
        slot.progress = 0;
        this.events.push('grillDone');
      } else if (slot.state === 'cooked' && slot.progress >= BURN_SECONDS) {
        slot.state = 'burnt';
        this.events.push('burnt');
      }
      if (slot.state === 'grilling' && this.random() < dt * 6) {
        this.particles.push({
          x: 300 + 40 + this.random() * 180, y: 380, vx: (this.random() - 0.5) * 12,
          vy: -28 - this.random() * 14, ttl: 0.9, size: 5 + this.random() * 5, kind: 'steam',
        });
      }
    }
    // Chopping progress while the player holds E at the board.
    if (held && this.chef.chopTarget) {
      const slot = this.chef.chopTarget;
      slot.progress += dt;
      if (this.random() < dt * 10) {
        this.particles.push({
          x: 60 + this.random() * 150, y: 380, vx: (this.random() - 0.5) * 60,
          vy: -40 - this.random() * 30, ttl: 0.5, size: 3 + this.random() * 3, kind: 'chop',
        });
      }
      if (slot.progress >= CHOP_SECONDS) {
        slot.state = 'chopped';
        slot.id = slot.id + 'Chopped';
        slot.progress = 0;
        this.chef.chopTarget = null;
        this.events.push('chopped');
      }
    }
    for (let i = this.particles.length - 1; i >= 0; i -= 1) {
      const p = this.particles[i];
      p.ttl -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.ttl <= 0) this.particles.splice(i, 1);
    }
    for (let i = this.floaters.length - 1; i >= 0; i -= 1) {
      const f = this.floaters[i];
      f.ttl -= dt;
      f.y -= 34 * dt;
      if (f.ttl <= 0) this.floaters.splice(i, 1);
    }
  }

  /** What the interact key does at the nearest station, if anything. */
  interact(stationId) {
    const chef = this.chef;
    const st = STATIONS[stationId];
    if (!st) return 'none';
    if (st.kind === 'crate') {
      if (chef.held) return 'handsFull';
      chef.held = makeItem(st.item);
      this.events.push('pickup');
      return 'pickup';
    }
    if (st.kind === 'chop') {
      const slots = this.slots.chopBoard;
      if (chef.held && (chef.held.id === 'tomato' || chef.held.id === 'lettuce' || chef.held.id === 'onion')) {
        const free = slots.findIndex((s) => s === null);
        if (free === -1) return 'boardFull';
        slots[free] = chef.held;
        chef.held.state = 'chopping';
        chef.held = null;
        this.events.push('placeChop');
        return 'placeChop';
      }
      const done = slots.findIndex((s) => s && s.state === 'chopped');
      if (done !== -1 && !chef.held) {
        chef.held = slots[done];
        slots[done] = null;
        this.events.push('pickup');
        return 'pickup';
      }
      const raw = slots.findIndex((s) => s && s.state === 'chopping');
      if (raw !== -1) {
        this.chef.chopTarget = slots[raw];
        return 'chopping';
      }
      return 'none';
    }
    if (st.kind === 'grill') {
      const slots = this.slots.grill;
      if (chef.held && chef.held.id === 'patty') {
        const free = slots.findIndex((s) => s === null);
        if (free === -1) return 'grillFull';
        slots[free] = chef.held;
        chef.held.state = 'grilling';
        chef.held.progress = 0;
        chef.held = null;
        this.events.push('placeGrill');
        return 'placeGrill';
      }
      const done = slots.findIndex((s) => s && (s.state === 'cooked' || s.state === 'burnt'));
      if (done !== -1 && !chef.held) {
        const item = slots[done];
        slots[done] = null;
        chef.held = makeItem(item.state === 'cooked' ? 'pattyCooked' : 'pattyBurnt');
        this.events.push('pickup');
        return 'pickup';
      }
      return 'none';
    }
    if (st.kind === 'assembly') {
      const slots = this.slots.assembly;
      if (!slots[0]) {
        if (chef.held && chef.held.id === 'plate') {
          slots[0] = chef.held;
          chef.held = null;
          return 'placePlate';
        }
        // Start a fresh plate on the counter when the chef holds an ingredient.
        if (chef.held && chef.held.id !== 'plate') {
          slots[0] = { id: 'plate', contents: [chef.held.id] };
          chef.held = null;
          this.events.push('addToPlate');
          return 'addToPlate';
        }
        return 'none';
      }
      const plate = slots[0];
      if (chef.held && chef.held.id !== 'plate') {
        if (plate.contents.includes(chef.held.id)) return 'alreadyOnPlate';
        plate.contents.push(chef.held.id);
        chef.held = null;
        this.events.push('addToPlate');
        return 'addToPlate';
      }
      if (!chef.held) {
        chef.held = plate;
        slots[0] = null;
        this.events.push('pickup');
        return 'pickup';
      }
      return 'none';
    }
    if (st.kind === 'trash') {
      if (chef.held) {
        chef.held = null;
        this.events.push('trash');
        return 'trash';
      }
      return 'none';
    }
    if (st.kind === 'serve') {
      if (!chef.held || chef.held.id !== 'plate') return 'needPlate';
      const plate = chef.held;
      const match = this.orders.find((o) => sameRecipe(plate.contents, RECIPES[o.recipeId].needs));
      if (!match) {
        this.combo = 0;
        this.floaters.push({ x: 1078, y: 540, text: 'WRONG ORDER!', color: '#ff5a4e', ttl: 1.4 });
        this.events.push('wrongServe');
        return 'wrongServe';
      }
      const recipe = RECIPES[match.recipeId];
      const patienceShare = Math.max(0, match.patience / match.maxPatience);
      const tip = Math.round(recipe.price * 0.5 * patienceShare);
      const earned = recipe.price + tip;
      this.coins += earned;
      this.served += 1;
      this.combo += 1;
      this.bestCombo = Math.max(this.bestCombo, this.combo);
      this.orders.splice(this.orders.indexOf(match), 1);
      chef.held = null;
      this.floaters.push({ x: 1078, y: 540, text: `+$${earned}`, color: '#ffd94d', ttl: 1.6 });
      if (this.combo > 0 && this.combo % 3 === 0) {
        this.coins += 5;
        this.floaters.push({ x: 1078, y: 500, text: 'COMBO +$5', color: '#7dff8a', ttl: 1.6 });
      }
      if (this.served % 4 === 0) {
        this.level += 1;
        this.flash = { text: `LEVEL ${this.level} — RUSH HOUR!`, color: '#ffd94d', until: this.time + 2 };
        this.events.push('levelUp');
      }
      this.events.push('served');
      return 'served';
    }
    return 'none';
  }

  /** Discard whatever the chef holds (Q key). */
  discardHeld() {
    if (!this.chef.held) return false;
    this.chef.held = null;
    this.events.push('trash');
    return true;
  }

  /** Move the chef by dx, dy (already scaled), pushing out of station rectangles. */
  moveChef(dx, dy) {
    const chef = this.chef;
    chef.x += dx;
    chef.y += dy;
    chef.x = Math.max(PLAYER.radius + 8, Math.min(1280 - PLAYER.radius - 8, chef.x));
    chef.y = Math.max(190, Math.min(800 - PLAYER.radius - 8, chef.y));
    const solids = [...Object.values(STATIONS), ...rectsOfDecor()];
    for (const r of solids) {
      const nearestX = Math.max(r.x, Math.min(chef.x, r.x + r.w));
      const nearestY = Math.max(r.y, Math.min(chef.y, r.y + r.h));
      const ddx = chef.x - nearestX;
      const ddy = chef.y - nearestY;
      const dist2 = ddx * ddx + ddy * ddy;
      if (dist2 < PLAYER.radius * PLAYER.radius) {
        const dist = Math.sqrt(dist2) || 0.01;
        chef.x = nearestX + (ddx / dist) * PLAYER.radius;
        chef.y = nearestY + (ddy / dist) * PLAYER.radius;
      }
    }
    chef.moving = dx !== 0 || dy !== 0;
    if (dx !== 0) chef.facing = dx > 0 ? 1 : -1;
  }
}

function rectsOfDecor() {
  // Decorative furniture is solid too, imported lazily to avoid a cycle.
  return DECOR_RECTS;
}

export const DECOR_RECTS = [
  { x: 900, y: 196, w: 120, h: 76 },
  { x: 1032, y: 196, w: 224, h: 76 },
  { x: 200, y: 560, w: 220, h: 90 },
  { x: 470, y: 560, w: 90, h: 90 },
];

export function sameRecipe(contents, needs) {
  if (contents.length !== needs.length) return false;
  return needs.every((n) => contents.includes(n));
}

/** Deterministic PRNG so a seed always replays the same day. */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
