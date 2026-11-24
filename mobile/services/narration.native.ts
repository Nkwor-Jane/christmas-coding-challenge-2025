import * as Speech from "expo-speech";
import type { NarrationEngine, NarrationOptions } from "./narration";

export function createNarrationEngine(): NarrationEngine {
  let position = 0;

  return {
    speak(text: string, options: NarrationOptions) {
      position = 0;
      return new Promise((resolve) => {
        Speech.stop();
        Speech.speak(text, {
          rate: options.speed,
          onDone: () => resolve(),
          onStopped: () => resolve(),
          onError: () => resolve(),
        });
      });
    },
    async pause() {
      Speech.pause();
    },
    async resume() {
      Speech.resume();
    },
    async stop() {
      Speech.stop();
    },
    async getPosition() {
      return position;
    },
  };
}
