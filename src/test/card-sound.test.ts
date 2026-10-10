import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { useCardSound } from "@/hooks/useCardSound";

afterEach(() => vi.unstubAllGlobals());

it("starts muted and does not initialize or play audio by default", () => {
  const constructor = vi.fn();
  vi.stubGlobal("AudioContext", constructor);
  const { result } = renderHook(() => useCardSound());
  expect(result.current.muted).toBe(true);
  act(() => result.current.play());
  expect(constructor).not.toHaveBeenCalled();
});

it("plays a quiet tone only after opt-in, and stops producing tones when muted", async () => {
  const oscillator = { type: "", frequency: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() }, connect: vi.fn(), disconnect: vi.fn(), start: vi.fn(), stop: vi.fn() };
  const gain = { gain: { setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() }, connect: vi.fn(), disconnect: vi.fn() };
  const createOscillator = vi.fn(() => oscillator);
  class MockAudio {
    state = "running";
    currentTime = 0;
    destination = {};
    createOscillator = createOscillator;
    createGain = () => gain;
    resume = vi.fn(async () => {});
    suspend = vi.fn(async () => {});
    close = vi.fn(async () => {});
  }
  vi.stubGlobal("AudioContext", MockAudio);
  const { result } = renderHook(() => useCardSound());
  act(() => result.current.toggle());
  await waitFor(() => expect(result.current.muted).toBe(false));
  act(() => result.current.play());
  expect(oscillator.start).toHaveBeenCalledOnce();
  expect(gain.gain.linearRampToValueAtTime).toHaveBeenCalledWith(0.035, 0.015);
  act(() => result.current.toggle());
  expect(result.current.muted).toBe(true);
  act(() => result.current.play());
  expect(createOscillator).toHaveBeenCalledOnce();
});