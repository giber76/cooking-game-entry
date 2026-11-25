// Sizzle & Serve — input: keyboard (WASD/arrows + E + Q) and mouse (click to walk,
// click a station to walk to it and use it). Exposes one small state object.
import { STATIONS } from './config.js';

export class Input {
  constructor(canvas) {
    this.keys = new Set();
    this.moveTarget = null; // { x, y, stationId } or null
    this.interactPressed = false;
    this.discardPressed = false;
    this.startPressed = false;
    this.restartPressed = false;
    this.canvas = canvas;
    this.onKey = (event) => {
      const key = event.key.toLowerCase();
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(key)) event.preventDefault();
      if (event.repeat) return;
      this.keys.add(key);
      if (key === 'e' || key === ' ') this.interactPressed = true;
      if (key === 'q') this.discardPressed = true;
      if (key === 'enter') this.startPressed = true;
      if (key === 'r') this.restartPressed = true;
    };
    this.onKeyUp = (event) => this.keys.delete(event.key.toLowerCase());
    this.onMouse = (event) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const x = (event.clientX - rect.left) * scaleX;
      const y = (event.clientY - rect.top) * scaleY;
      let stationId = null;
      for (const [id, st] of Object.entries(STATIONS)) {
        if (x >= st.x && x <= st.x + st.w && y >= st.y && y <= st.y + st.h) { stationId = id; break; }
      }
      // Walk there; the loop uses the station when it comes in reach.
      // (Do not set interactPressed here: firing "use" at once would act on
      // whatever station is nearest right now and cancel the walk.)
      this.moveTarget = { x, y, stationId };
    };
    window.addEventListener('keydown', this.onKey);
    window.addEventListener('keyup', this.onKeyUp);
    canvas.addEventListener('mousedown', this.onMouse);
  }

  /** Movement direction from keys, normalised. */
  keysDirection() {
    let x = 0;
    let y = 0;
    if (this.keys.has('a') || this.keys.has('arrowleft')) x -= 1;
    if (this.keys.has('d') || this.keys.has('arrowright')) x += 1;
    if (this.keys.has('w') || this.keys.has('arrowup')) y -= 1;
    if (this.keys.has('s') || this.keys.has('arrowdown')) y += 1;
    if (x === 0 && y === 0) return null;
    const len = Math.hypot(x, y);
    return { x: x / len, y: y / len };
  }

  get interactHeld() {
    return this.keys.has('e') || this.keys.has(' ');
  }

  /** Clear the one-shot presses after the frame consumed them. */
  consume() {
    this.interactPressed = false;
    this.discardPressed = false;
    this.startPressed = false;
    this.restartPressed = false;
  }
}
