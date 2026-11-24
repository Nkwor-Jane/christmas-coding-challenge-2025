export type NarrationOptions = {
  voiceId: string;
  speed: number;
};

export interface NarrationEngine {
  speak(text: string, options: NarrationOptions): Promise<void>;
  pause(): Promise<void>;
  resume(): Promise<void>;
  stop(): Promise<void>;
  getPosition(): Promise<number>;
}

export type NarrationSegment = {
  page_number: number;
  text: string;
  char_start: number;
};

export function createNarrationEngine(): NarrationEngine {
  let position = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let finish: (() => void) | null = null;

  const settle = () => {
    if (timer) clearTimeout(timer);
    timer = null;
    const done = finish;
    finish = null;
    done?.();
  };

  return {
    speak(text: string, options: NarrationOptions) {
      position = 0;
      return new Promise((resolve) => {
        finish = resolve;
        const words = text.split(/\s+/).filter(Boolean).length;
        const delay = Math.max(900, (words / Math.max(options.speed, 0.5)) * 420);
        timer = setTimeout(settle, delay);
        if (typeof window !== "undefined" && window.speechSynthesis) {
          window.speechSynthesis.cancel();
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.rate = options.speed;
          utterance.onboundary = (event) => {
            position = event.charIndex ?? position;
          };
          utterance.onend = settle;
          utterance.onerror = settle;
          window.speechSynthesis.speak(utterance);
        }
      });
    },
    async pause() {
      if (timer) clearTimeout(timer);
      timer = null;
      window.speechSynthesis?.pause();
    },
    async resume() {
      window.speechSynthesis?.resume();
      if (finish && !timer) timer = setTimeout(settle, 900);
    },
    async stop() {
      window.speechSynthesis?.cancel();
      settle();
    },
    async getPosition() {
      return position;
    },
  };
}
