// Sizzle & Serve — configuration: canvas size, stations, ingredients and recipes.
// Every number the kitchen is built from lives here, so tuning the game means
// editing this one file and nothing else.
export const VIEW = { width: 1280, height: 800 };
export const DAY_SECONDS = 150;
export const PLAYER = { radius: 22, speed: 265, interactRange: 78 };

/** Ingredients. chop: needs the chopping board; grill: needs the grill. */
export const INGREDIENTS = {
  tomato: { name: 'Tomato', color: '#e8443a', dark: '#a82318', chop: true, price: 0 },
  lettuce: { name: 'Lettuce', color: '#57b84a', dark: '#2f7d2b', chop: true, price: 0 },
  onion: { name: 'Onion', color: '#e8d8f0', dark: '#b493c4', chop: true, price: 0 },
  cheese: { name: 'Cheese', color: '#f7c948', dark: '#d99a16', chop: false, price: 0 },
  bun: { name: 'Bun', color: '#e8a95c', dark: '#b97a2e', chop: false, price: 0 },
  patty: { name: 'Patty', color: '#8a5a3b', dark: '#5d3a24', grill: true, price: 0 },
};

/** A cooked patty is its own item; a burnt one can only be binned. */
export const COOKED = {
  pattyCooked: { name: 'Grilled Patty', color: '#6b4423', dark: '#452a15' },
  pattyBurnt: { name: 'Burnt Patty', color: '#2b2b2b', dark: '#111111' },
};

/**
 * Recipes: the exact plate contents an order wants. `needs` lists item ids;
 * chopped items are named `<id>Chopped` and the grilled patty `pattyCooked`.
 */
export const RECIPES = {
  salad: {
    name: 'Garden Salad', price: 8, minLevel: 1,
    needs: ['lettuceChopped', 'tomatoChopped'],
    blurb: 'Crisp lettuce, fresh tomato',
  },
  burger: {
    name: 'Classic Burger', price: 12, minLevel: 1,
    needs: ['bun', 'pattyCooked', 'lettuceChopped'],
    blurb: 'Bun, grilled patty, lettuce',
  },
  cheeseMelt: {
    name: 'Cheese Melt', price: 13, minLevel: 1,
    needs: ['bun', 'pattyCooked', 'cheese'],
    blurb: 'Bun, grilled patty, cheese',
  },
  deluxe: {
    name: 'Deluxe Burger', price: 18, minLevel: 2,
    needs: ['bun', 'pattyCooked', 'lettuceChopped', 'tomatoChopped', 'cheese'],
    blurb: 'The works: bun, patty, lettuce, tomato, cheese',
  },
  onionBurger: {
    name: 'Onion Stack', price: 15, minLevel: 3,
    needs: ['bun', 'pattyCooked', 'onionChopped', 'cheese'],
    blurb: 'Bun, patty, sweet onion, cheese',
  },
};

export const CHOP_SECONDS = 1.6;
export const GRILL_SECONDS = 6;
export const BURN_SECONDS = 5; // after cooked, this long before it burns
export const ORDER_PATIENCE = 55;
export const ORDER_SPAWN_SECONDS = 11;
export const MAX_ORDERS = 4;
export const START_HEARTS = 3;

/** Station rectangles in kitchen coordinates. */
export const STATIONS = {
  crateTomato: { kind: 'crate', item: 'tomato', x: 24, y: 196, w: 126, h: 76, label: 'Tomatoes' },
  crateLettuce: { kind: 'crate', item: 'lettuce', x: 162, y: 196, w: 126, h: 76, label: 'Lettuce' },
  crateOnion: { kind: 'crate', item: 'onion', x: 300, y: 196, w: 126, h: 76, label: 'Onions' },
  crateCheese: { kind: 'crate', item: 'cheese', x: 438, y: 196, w: 126, h: 76, label: 'Cheese' },
  crateBun: { kind: 'crate', item: 'bun', x: 576, y: 196, w: 126, h: 76, label: 'Buns' },
  cratePatty: { kind: 'crate', item: 'patty', x: 714, y: 196, w: 126, h: 76, label: 'Patties' },
  chopBoard: { kind: 'chop', x: 24, y: 330, w: 220, h: 100, label: 'Chopping Board', slots: 2 },
  grill: { kind: 'grill', x: 300, y: 330, w: 260, h: 100, label: 'Grill', slots: 2 },
  assembly: { kind: 'assembly', x: 640, y: 330, w: 260, h: 100, label: 'Assembly Counter', slots: 1 },
  trash: { kind: 'trash', x: 24, y: 560, w: 126, h: 90, label: 'Trash' },
  serve: { kind: 'serve', x: 900, y: 560, w: 356, h: 140, label: 'Serve Window' },
};

/** Decorative (non-interactive) furniture drawn on the floor. */
export const DECOR = [
  { kind: 'fridge', x: 900, y: 196, w: 120, h: 76, label: 'Fridge' },
  { kind: 'shelf', x: 1032, y: 196, w: 224, h: 76, label: 'Spice Shelf' },
  { kind: 'sink', x: 200, y: 560, w: 220, h: 90, label: 'Sink' },
  { kind: 'plant', x: 470, y: 560, w: 90, h: 90, label: '' },
];

export const RECIPE_IDS = Object.keys(RECIPES);
