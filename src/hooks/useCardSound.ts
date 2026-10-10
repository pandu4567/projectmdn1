import { useCallback, useEffect, useRef, useState } from "react";

// Audio is created only after an explicit user gesture, never during SSR.
export function useCardSound() {
  const [muted, setMuted] = useState(true);
  const audio = useRef<AudioContext | null>(null);

  useEffect(() => () => { void audio.current?.close(); }, []);

  const toggle = useCallback(() => {
    if (!muted) {
      setMuted(true);
      void audio.current?.suspend();
      return;
    }
    try {
      audio.current ??= new AudioContext();
      void audio.current.resume().then(() => setMuted(false)).catch(() => setMuted(true));
    } catch {
      setMuted(true);
    }
  }, [muted]);

  const play = useCallback(() => {
    const context = audio.current;
    if (muted || !context || context.state !== "running") return;
    const tone = context.createOscillator();
    const gain = context.createGain();
    const now = context.currentTime;
    tone.type = "sine";
    tone.frequency.setValueAtTime(660, now);
    tone.frequency.exponentialRampToValueAtTime(440, now + 0.16);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.035, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    tone.connect(gain);
    gain.connect(context.destination);
    tone.start(now);
    tone.stop(now + 0.2);
    tone.onended = () => { tone.disconnect(); gain.disconnect(); };
  }, [muted]);

  /** Bright two-note "ding" for month transitions. */
  const ding = useCallback(() => {
    const context = audio.current;
    if (muted || !context || context.state !== "running") return;
    const now = context.currentTime;
    [988, 1319].forEach((f, i) => {
      const tone = context.createOscillator();
      const gain = context.createGain();
      const t = now + i * 0.12;
      tone.type = "triangle";
      tone.frequency.setValueAtTime(f, t);
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.06, t + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
      tone.connect(gain);
      gain.connect(context.destination);
      tone.start(t);
      tone.stop(t + 0.65);
      tone.onended = () => { tone.disconnect(); gain.disconnect(); };
    });
  }, [muted]);

  return { muted, toggle, play, ding };
}