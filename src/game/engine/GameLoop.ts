import { gameConfig } from '../config/gameConfig';

/**
 * Игровой цикл с фиксированным шагом. Логика обновляется шагами по
 * gameConfig.fixedStep независимо от частоты кадров; отрисовка — каждый кадр.
 */
export class GameLoop {
  speed = 1;
  paused = false;
  private raf = 0;
  private last = 0;
  private acc = 0;
  private running = false;

  constructor(
    private readonly step: (dt: number) => void,
    private readonly render: (frameDt: number) => void,
  ) {}

  start(): void {
    if (this.running) return;
    this.running = true;
    this.last = performance.now();
    this.acc = 0;
    document.addEventListener('visibilitychange', this.onVisibility);
    this.raf = requestAnimationFrame(this.frame);
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.raf);
    document.removeEventListener('visibilitychange', this.onVisibility);
  }

  private onVisibility = (): void => {
    // При возвращении на вкладку не «догоняем» пропущенное время.
    if (!document.hidden) {
      this.last = performance.now();
      this.acc = 0;
    }
  };

  private frame = (now: number): void => {
    if (!this.running) return;
    let frameDt = (now - this.last) / 1000;
    this.last = now;
    // Большие разрывы (сворачивание, отладка) обрезаем.
    if (frameDt > 0.25) frameDt = 0.25;

    if (!this.paused && !document.hidden) {
      const fs = gameConfig.fixedStep;
      this.acc += frameDt * this.speed;
      let steps = 0;
      const max = gameConfig.maxStepsPerFrame * this.speed;
      while (this.acc >= fs && steps < max) {
        this.step(fs);
        this.acc -= fs;
        steps++;
      }
      if (steps >= max) this.acc = 0;
    }
    this.render(this.paused ? 0 : frameDt);
    this.raf = requestAnimationFrame(this.frame);
  };
}
