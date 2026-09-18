import { CacheStorage, SplendidGrandPiano } from "smplr";
import type { SplendidGrandPiano as SplendidGrandPianoInstrument } from "smplr";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AudioEngineContext,
  type AudioEngineStatus,
} from "./AudioEngineContextValue";

interface Engine {
  audioContext: AudioContext;
  piano: SplendidGrandPianoInstrument;
}

const disposeEngine = async (engine: Engine | null) => {
  if (!engine) return;
  try {
    engine.piano.dispose();
  } catch {
    // Continue closing the context even if instrument teardown is incomplete.
  }
  if (engine.audioContext.state !== "closed") {
    try {
      await engine.audioContext.close();
    } catch {
      // There is no recovery action for a context that refuses to close.
    }
  }
};

export const AudioEngineProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const engineRef = useRef<Engine | null>(null);
  const preparationRef = useRef<Promise<void> | null>(null);
  const mountedRef = useRef(true);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [piano, setPiano] = useState<SplendidGrandPianoInstrument | null>(null);
  const [status, setStatus] = useState<AudioEngineStatus>("idle");
  const [error, setError] = useState<Error | null>(null);
  const [loadProgress, setLoadProgress] = useState<{
    loaded: number;
    total: number;
  } | null>(null);

  const prepareEngine = useCallback(async (replaceFailedEngine: boolean) => {
    // The engine ref is authoritative. React may not have committed the
    // corresponding `ready` state yet when another upload arrives.
    if (!replaceFailedEngine && engineRef.current) {
      return preparationRef.current ?? undefined;
    }
    if (!replaceFailedEngine && preparationRef.current) {
      return preparationRef.current;
    }

    const preparation = (async () => {
      if (replaceFailedEngine) {
        const oldEngine = engineRef.current;
        engineRef.current = null;
        setAudioContext(null);
        setPiano(null);
        await disposeEngine(oldEngine);
      }

      if (!mountedRef.current) return;
      setStatus("loading");
      setError(null);
      setLoadProgress(null);

      let nextAudioContext: AudioContext | null = null;
      let nextEngine: Engine | null = null;
      try {
        nextAudioContext = new AudioContext();
        const storage =
          typeof globalThis.caches !== "undefined"
            ? CacheStorage("midi-visualizer-piano")
            : undefined;
        const nextPiano = SplendidGrandPiano(nextAudioContext, {
          ...(storage ? { storage } : {}),
          onLoadProgress: (progress) => {
            if (mountedRef.current) setLoadProgress(progress);
          },
        });
        nextEngine = {
          audioContext: nextAudioContext,
          piano: nextPiano,
        };
        engineRef.current = nextEngine;
        setAudioContext(nextAudioContext);
        setPiano(nextPiano);
        await nextPiano.ready;
        if (mountedRef.current && engineRef.current === nextEngine) {
          setStatus("ready");
          setLoadProgress(null);
        }
      } catch (cause) {
        if (engineRef.current === nextEngine) engineRef.current = null;
        if (nextEngine) {
          await disposeEngine(nextEngine);
        } else if (nextAudioContext?.state !== "closed") {
          try {
            await nextAudioContext?.close();
          } catch {
            // Preserve the preparation failure as the useful user-facing error.
          }
        }
        if (mountedRef.current) {
          setAudioContext(null);
          setPiano(null);
          setStatus("error");
          setError(
            cause instanceof Error
              ? cause
              : new Error("The piano samples could not be loaded."),
          );
          setLoadProgress(null);
        }
      }
    })();

    preparationRef.current = preparation;
    try {
      await preparation;
    } finally {
      if (preparationRef.current === preparation) preparationRef.current = null;
    }
  }, []);

  const prepare = useCallback(() => prepareEngine(false), [prepareEngine]);
  const retry = useCallback(() => prepareEngine(true), [prepareEngine]);

  const resume = useCallback(async () => {
    const engine = engineRef.current;
    if (!engine || status !== "ready") {
      throw new Error("The piano is not ready yet.");
    }
    try {
      await engine.audioContext.resume();
    } catch (cause) {
      const resumeError =
        cause instanceof Error
          ? cause
          : new Error("Audio could not be started.");
      setStatus("error");
      setError(resumeError);
      throw resumeError;
    }
  }, [status]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      const engine = engineRef.current;
      engineRef.current = null;
      void disposeEngine(engine);
    };
  }, []);

  const value = useMemo(
    () => ({
      audioContext,
      piano,
      status,
      error,
      loadProgress,
      prepare,
      retry,
      resume,
    }),
    [audioContext, error, loadProgress, piano, prepare, resume, retry, status],
  );

  return <AudioEngineContext value={value}>{children}</AudioEngineContext>;
};
