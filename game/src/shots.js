// Sizzle & Serve — screenshot scenes behind ?shot=cover|orders|assembly|serve.
// Each scene sets up a real kitchen state through the world's own state (orders,
// station slots, the chef's hands, coins and the timer), then the renderer draws
// it exactly as it draws live play. The same seed always gives the same frame.
import { makeItem, makeOrder } from './world.js';

function baseDay(world, opts) {
  world.screen = 'play';
  world.time = opts.time;
  world.dayLeft = opts.dayLeft;
  world.coins = opts.coins;
  world.served = opts.served;
  world.level = opts.level;
  world.combo = opts.combo || 0;
  world.bestCombo = Math.max(world.bestCombo, world.combo);
  world.hearts = opts.hearts ?? 3;
}

function placeOrder(world, recipeId, patienceShare) {
  const order = makeOrder(recipeId, world.level);
  order.patience = order.maxPatience * patienceShare;
  world.orders.push(order);
  return order;
}

function chopOnBoard(world, slotIndex, id, progress) {
  const item = makeItem(id);
  item.state = 'chopping';
  item.progress = progress;
  world.slots.chopBoard[slotIndex] = item;
  return item;
}

function grillPatty(world, slotIndex, state, progress) {
  const item = makeItem('patty');
  item.state = state;
  item.progress = progress;
  world.slots.grill[slotIndex] = item;
  return item;
}

/**
 * Stage the named scene on `world` and return nothing; the caller renders one frame.
 * cover: the rush at its busiest — three tickets, grill sizzling, a burger
 *   mid-assembly, the chef carrying a chopped tomato.
 * orders: the day just opened — two fresh tickets, crates full, chef at the crates.
 * assembly: a plate on the counter with bun + patty + lettuce, chef adding tomato.
 * serve: a finished Deluxe Burger in the chef's hands at the serve window.
 */
export function stageShot(name, world) {
  world.reset();
  if (name === 'orders') {
    baseDay(world, { time: 6, dayLeft: 144, coins: 0, served: 0, level: 1 });
    placeOrder(world, 'burger', 0.92);
    placeOrder(world, 'salad', 0.85);
    world.chef.x = 225;
    world.chef.y = 300;
    world.chef.held = makeItem('lettuce');
    world.chef.facing = 1;
  } else if (name === 'assembly') {
    baseDay(world, { time: 58, dayLeft: 92, coins: 46, served: 4, level: 2, combo: 2 });
    placeOrder(world, 'deluxe', 0.55);
    placeOrder(world, 'cheeseMelt', 0.78);
    grillPatty(world, 0, 'grilling', 4.2);
    chopOnBoard(world, 0, 'tomato', 1.1);
    world.slots.assembly[0] = { id: 'plate', contents: ['bun', 'pattyCooked', 'lettuceChopped'] };
    world.chef.x = 770;
    world.chef.y = 520;
    world.chef.held = makeItem('tomatoChopped');
    world.chef.facing = -1;
    world.floaters.push({ x: 770, y: 300, text: 'Almost there!', color: '#ffd94d', ttl: 99 });
  } else if (name === 'serve') {
    baseDay(world, { time: 121, dayLeft: 29, coins: 118, served: 9, level: 3, combo: 3 });
    placeOrder(world, 'deluxe', 0.4);
    placeOrder(world, 'onionBurger', 0.7);
    placeOrder(world, 'burger', 0.85);
    grillPatty(world, 1, 'cooked', 1.5);
    world.chef.x = 1000;
    world.chef.y = 520;
    world.chef.held = {
      id: 'plate',
      contents: ['bun', 'pattyCooked', 'lettuceChopped', 'tomatoChopped', 'cheese'],
    };
    world.chef.facing = 1;
    world.floaters.push({ x: 1180, y: 470, text: '+$27', color: '#ffd94d', ttl: 99 });
    world.floaters.push({ x: 1180, y: 430, text: 'COMBO +$5', color: '#7dff8a', ttl: 99 });
  } else {
    // cover: the busiest frame of the day.
    baseDay(world, { time: 74, dayLeft: 76, coins: 86, served: 6, level: 2, combo: 3 });
    placeOrder(world, 'burger', 0.62);
    placeOrder(world, 'deluxe', 0.45);
    placeOrder(world, 'cheeseMelt', 0.8);
    grillPatty(world, 0, 'grilling', 4.6);
    grillPatty(world, 1, 'cooked', 0.8);
    chopOnBoard(world, 0, 'lettuce', 0.9);
    world.slots.assembly[0] = { id: 'plate', contents: ['bun', 'pattyCooked'] };
    world.chef.x = 580;
    world.chef.y = 500;
    world.chef.held = makeItem('tomatoChopped');
    world.chef.facing = -1;
    world.floaters.push({ x: 640, y: 300, text: '+$18', color: '#ffd94d', ttl: 99 });
    for (let i = 0; i < 8; i += 1) {
      world.particles.push({
        x: 340 + i * 22, y: 400 - (i % 3) * 12, vx: 0, vy: -20,
        ttl: 99, size: 6 + (i % 3) * 2, kind: 'steam',
      });
    }
  }
  // Keep the scene still for the camera: nothing ticks while shot mode is on.
  world.spawnTimer = 999;
}
