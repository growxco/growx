import { useCallback, useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX, X, Beaker } from 'lucide-react';

/**
 * Easter-egg sound lab. Off by default.
 * Toggle: Ctrl+Shift+S (or Cmd+Shift+S on Mac).
 * Generates ambient + click sounds via WebAudio. No assets.
 */
export default function SoundLab() {
  const [open, setOpen] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [volume, setVolume] = useState(0.18);
  const ctxRef = useRef(null);
  const masterRef = useRef(null);
  const oscRef = useRef(null);
  const filterRef = useRef(null);
  const lfoRef = useRef(null);
  const lfoGainRef = useRef(null);

  // Hotkey
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const ensureCtx = useCallback(() => {
    if (ctxRef.current) return ctxRef.current;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    const ctx = new Ctx();
    const master = ctx.createGain();
    master.gain.value = volume;
    master.connect(ctx.destination);
    ctxRef.current = ctx;
    masterRef.current = master;
    return ctx;
  }, [volume]);

  const playClick = useCallback(() => {
    const ctx = ensureCtx();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.value = 520;
    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.10);
    osc.connect(g);
    g.connect(masterRef.current);
    osc.start();
    osc.stop(ctx.currentTime + 0.12);
  }, [ensureCtx]);

  // Click feedback (subtle)
  useEffect(() => {
    if (!enabled) return;
    const handler = (e) => {
      const t = e.target;
      if (!(t instanceof Element)) return;
      if (t.closest('button, a, [role="button"], summary')) {
        playClick();
      }
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [enabled, playClick]);

  const startAmbient = () => {
    const ctx = ensureCtx();
    if (!ctx || oscRef.current) return;
    // brown-ish noise approximated with low-pass filtered sawtooth pair + LFO
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    osc1.type = 'sawtooth';
    osc2.type = 'sine';
    osc1.frequency.value = 55;
    osc2.frequency.value = 82;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 240;
    filter.Q.value = 0.6;

    const ambGain = ctx.createGain();
    ambGain.gain.value = 0.0001;
    ambGain.gain.exponentialRampToValueAtTime(0.10, ctx.currentTime + 1.5);

    // slow breathing LFO
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.value = 0.12;
    lfoGain.gain.value = 0.06;
    lfo.connect(lfoGain);
    lfoGain.connect(ambGain.gain);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(ambGain);
    ambGain.connect(masterRef.current);

    osc1.start();
    osc2.start();
    lfo.start();

    oscRef.current = [osc1, osc2];
    filterRef.current = filter;
    lfoRef.current = lfo;
    lfoGainRef.current = ambGain;
  };

  const stopAmbient = () => {
    const ctx = ctxRef.current;
    if (!ctx || !oscRef.current) return;
    if (lfoGainRef.current) {
      lfoGainRef.current.gain.cancelScheduledValues(ctx.currentTime);
      lfoGainRef.current.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.6);
    }
    setTimeout(() => {
      oscRef.current?.forEach((o) => { try { o.stop(); } catch {} });
      try { lfoRef.current?.stop(); } catch {}
      oscRef.current = null;
      lfoRef.current = null;
      filterRef.current = null;
    }, 700);
  };

  // Sync ambient
  useEffect(() => {
    if (enabled) startAmbient();
    else stopAmbient();
    return () => stopAmbient();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  // Sync volume
  useEffect(() => {
    if (masterRef.current && ctxRef.current) {
      masterRef.current.gain.linearRampToValueAtTime(volume, ctxRef.current.currentTime + 0.2);
    }
  }, [volume]);

  if (!open) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[58] w-72 overflow-hidden rounded-2xl glass-strong shadow-elevated">
      <div className="flex items-center gap-2 border-b border-foreground/10 px-4 py-3">
        <Beaker className="size-3.5 text-emerald-glow" />
        <span className="font-mono text-[11px] uppercase tracking-wider text-foreground">sound · lab</span>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Fechar"
          className="ml-auto inline-flex size-7 items-center justify-center rounded-md text-foreground/60 hover:bg-foreground/10 hover:text-foreground"
        >
          <X className="size-3.5" />
        </button>
      </div>
      <div className="space-y-4 p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {enabled ? <Volume2 className="size-4 text-emerald-glow" /> : <VolumeX className="size-4 text-muted-foreground" />}
            <span className="text-sm font-medium text-foreground">Ambient drone</span>
          </div>
          <button
            type="button"
            onClick={() => setEnabled(!enabled)}
            className={
              'relative h-6 w-11 rounded-full transition-colors ' +
              (enabled ? 'bg-emerald' : 'bg-foreground/20')
            }
            aria-label="Toggle ambient"
          >
            <span
              className={
                'absolute top-0.5 size-5 rounded-full bg-background transition-transform ' +
                (enabled ? 'translate-x-[22px]' : 'translate-x-0.5')
              }
            />
          </button>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            <span>volume</span>
            <span>{Math.round(volume * 100)}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="0.5"
            step="0.01"
            value={volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            className="w-full accent-emerald"
          />
        </div>

        <p className="text-[11px] leading-relaxed text-muted-foreground">
          Lab experimental. Off por padrão. Toggle <kbd className="rounded border border-foreground/10 bg-background/50 px-1 py-0.5 font-mono text-[10px]">Ctrl + Shift + S</kbd>.
        </p>
      </div>
    </div>
  );
}
