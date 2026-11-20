import { Timer, getConsoleFunction, setConsoleFunction } from 'three';

export interface ThreeTimerClockAdapter {
  autoStart: boolean;
  startTime: number;
  oldTime: number;
  elapsedTime: number;
  running: boolean;
  start: () => void;
  stop: () => void;
  getElapsedTime: () => number;
  getDelta: () => number;
  dispose: () => void;
}

const DEPRECATED_CLOCK_WARNING = 'THREE.Clock: This module has been deprecated';

/**
 * Pure predicate deciding whether a Three.js console log is the known
 * upstream @react-three/fiber v9 Clock store initialization notice.
 */
export function shouldSuppressThreeDeprecationWarning(
  type: 'log' | 'warn' | 'error',
  message: string,
): boolean {
  return type === 'warn' && message.includes(DEPRECATED_CLOCK_WARNING);
}

let threeConsoleFilterInstalled = false;

/**
 * Installs Three.js's official setConsoleFunction hook once to silence
 * @react-three/fiber v9's internal new THREE.Clock() constructor warning
 * while forwarding all other Three.js warnings and errors normally.
 */
export function installThreeClockDeprecationFilter(): void {
  if (threeConsoleFilterInstalled) return;
  threeConsoleFilterInstalled = true;

  const previous = getConsoleFunction();
  setConsoleFunction((type, message, ...params) => {
    if (shouldSuppressThreeDeprecationWarning(type, message)) {
      return;
    }

    if (previous) {
      previous(type, message, ...params);
      return;
    }

    if (type === 'error') {
      console.error(message, ...params);
    } else if (type === 'warn') {
      console.warn(message, ...params);
    } else {
      console.log(message, ...params);
    }
  });
}

/**
 * Creates a Clock-compatible adapter backed by THREE.Timer so React Three Fiber's
 * runtime frame loop uses THREE.Timer without deprecated Clock calls.
 */
export function createThreeTimerClock(doc?: Document | null): ThreeTimerClockAdapter {
  const timer = new Timer();
  if (doc) {
    timer.connect(doc);
  }

  let autoStart = true;
  let running = false;
  let startTime = 0;
  let oldTime = 0;
  let baseElapsedOffset = 0;

  const adapter: ThreeTimerClockAdapter = {
    get autoStart() {
      return autoStart;
    },
    set autoStart(val: boolean) {
      autoStart = val;
    },
    get startTime() {
      return startTime;
    },
    set startTime(val: number) {
      startTime = val;
    },
    get oldTime() {
      return oldTime;
    },
    set oldTime(val: number) {
      oldTime = val;
    },
    get elapsedTime() {
      return baseElapsedOffset + timer.getElapsed();
    },
    set elapsedTime(val: number) {
      baseElapsedOffset = val - timer.getElapsed();
    },
    get running() {
      return running;
    },
    set running(val: boolean) {
      running = val;
    },
    start() {
      timer.reset();
      startTime = performance.now();
      oldTime = startTime;
      running = true;
    },
    stop() {
      running = false;
    },
    getElapsedTime() {
      adapter.getDelta();
      return adapter.elapsedTime;
    },
    getDelta() {
      if (autoStart && !running) {
        adapter.start();
        return 0;
      }

      if (!running) {
        return 0;
      }

      timer.update();
      oldTime = performance.now();
      return timer.getDelta();
    },
    dispose() {
      running = false;
      timer.dispose();
    },
  };

  return adapter;
}
