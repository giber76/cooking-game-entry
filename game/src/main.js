// Sizzle & Serve — main: the game loop, movement, interaction and screens.
// ?shot=cover|orders|assembly|serve stages one still frame for screenshots;
// otherwise the game plays live with keyboard and mouse.
import { VIEW, PLAYER, STATIONS } from './config.js';
import { World, SCREEN_TITLE, SCREEN_PLAY, SCREEN_OVER } from './world.js';
import { Input } from './input.js';
import { render } from './render.js';
import { playEvent, setSizzle, ensureAudio } from './audio.js';
import { stageShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width = VIEW.width;
canvas.height = VIEW.height;

const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');
const seed = Number(params.get('seed') || 7);

const world = new World(seed);
const input = new Input(canvas);
// Exposed for local play-testing only; the game never reads it.
window.__world = world;

if (shotName) {
  stageShot(shotName, world);
  render(ctx, world, null, 0);
  document.title = `Sizzle & Serve — shot ${shotName}`;
} else {
  let last = performance.now();
  let hint = null;

  function nearestStation() {
    const chef = world.chef;
    let best = null;
    let bestDist = Infinity;
    for (const [id, st] of Object.entries(STATIONS)) {
      const cx = Math.max(st.x, Math.min(chef.x, st.x + st.w));
      const cy = Math.max(st.y, Math.min(chef.y, st.y + st.h));
      const d = Math.hypot(chef.x - cx, chef.y - cy);
      if (d < bestDist) { bestDist = d; best = id; }
    }
    return bestDist <= PLAYER.interactRange ? best : null;
  }

  function hintFor(stationId) {
    if (!stationId) return null;
    const st = STATIONS[stationId];
    const held = world.chef.held;
    const heldName = held ? (held.id === 'plate' ? 'plate' : held.id) : 'empty hands';
    if (st.kind === 'crate') return held ? `Hands full (${heldName})` : `E: Take ${st.label.slice(0, -1)}`;
    if (st.kind === 'chop') {
      if (held && ['tomato', 'lettuce', 'onion'].includes(held.id)) return 'E: Put on board to chop';
      const done = world.slots.chopBoard.find((s) => s && s.state === 'chopped');
      if (done && !held) return 'E: Pick up chopped veg';
      if (world.slots.chopBoard.some((s) => s && s.state === 'chopping')) return 'Hold E at the board to chop';
      return 'Chopping Board — bring tomato, lettuce or onion';
    }
    if (st.kind === 'grill') {
      if (held && held.id === 'patty') return 'E: Put patty on the grill';
      const done = world.slots.grill.find((s) => s && (s.state === 'cooked' || s.state === 'burnt'));
      if (done && !held) return 'E: Pick up patty — before it burns!';
      return 'Grill — patties cook here, watch the bar';
    }
    if (st.kind === 'assembly') {
      if (held && held.id !== 'plate') return 'E: Add to the plate';
      if (!held && world.slots.assembly[0]) return 'E: Pick up the plate';
      return 'Assembly Counter — build the plate here';
    }
    if (st.kind === 'trash') return held ? 'E: Bin what you are holding' : 'Trash — bin burnt food here';
    if (st.kind === 'serve') return held && held.id === 'plate' ? 'E: SERVE the plate!' : 'Serve Window — bring a finished plate';
    return null;
  }

  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const t = now / 1000;

    if (world.screen === SCREEN_TITLE) {
      if (input.startPressed) {
        ensureAudio();
        world.startDay();
      }
    } else if (world.screen === SCREEN_OVER) {
      if (input.restartPressed) world.startDay();
    } else if (world.screen === SCREEN_PLAY) {
      // Movement: keys win; otherwise walk to the mouse target.
      const keyDir = input.keysDirection();
      let moved = false;
      if (keyDir) {
        input.moveTarget = null;
        world.moveChef(keyDir.x * PLAYER.speed * dt, keyDir.y * PLAYER.speed * dt);
        moved = true;
      } else if (input.moveTarget) {
        const target = input.moveTarget;
        // A click on a station is a walk-to-and-use: as soon as the station
        // is in reach, use it (the click point itself may sit inside the
        // counter, where the chef can never stand).
        if (target.stationId) {
          const near = nearestStation();
          if (near === target.stationId) {
            input.moveTarget = null;
            world.interact(near);
          }
        }
        if (input.moveTarget) {
          const dx = target.x - world.chef.x;
          const dy = target.y - world.chef.y;
          const dist = Math.hypot(dx, dy);
          if (dist > 8) {
            world.moveChef((dx / dist) * PLAYER.speed * dt, (dy / dist) * PLAYER.speed * dt);
            moved = true;
          } else {
            input.moveTarget = null;
          }
        }
      }
      if (!moved) world.chef.moving = false;

      const stationId = nearestStation();
      // Click-to-use: when the mouse target was a station and we arrived, use it.
      if (input.interactPressed && stationId) {
        const result = world.interact(stationId);
        if (result === 'chopping') {
          // hold-to-chop is handled below through interactHeld
        } else if (result !== 'none') {
          input.moveTarget = null;
        }
      }
      if (input.discardPressed) world.discardHeld();

      // Hold E at the chopping board to keep chopping.
      const chopping = input.interactHeld && stationId === 'chopBoard';
      if (chopping && !world.chef.chopTarget) {
        const slot = world.slots.chopBoard.find((s) => s && s.state === 'chopping');
        if (slot) world.chef.chopTarget = slot;
      }
      if (!chopping) world.chef.chopTarget = null;

      world.step(dt, chopping);
      for (const event of world.events) playEvent(event);
      world.events.length = 0;
      const grilling = world.slots.grill.some((s) => s && s.state === 'grilling');
      setSizzle(grilling);
      hint = hintFor(stationId);
    }

    render(ctx, world, hint, t);
    input.consume();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
