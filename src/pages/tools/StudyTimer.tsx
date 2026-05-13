import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Timer, Play, Pause, RotateCcw, SkipForward, Maximize2, Minimize2 } from "lucide-react";
import { Layout } from "@/components/Layout";
import { ToolPageHeader } from "@/components/ToolPageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";

type Mode = "focus" | "short" | "long";

type Settings = {
  focus: number;
  short: number;
  long: number;
  longEvery: number;
  autoSwitch: boolean;
  sound: boolean;
  notifications: boolean;
};

type Stats = {
  date: string;
  completedFocus: number;
  totalFocusSeconds: number;
};

// Persisted timer state — survives navigation, refresh, tab switch
type TimerState = {
  mode: Mode;
  running: boolean;
  endAt: number | null;        // epoch ms when current session ends (only when running)
  pausedRemaining: number | null; // seconds left when paused
  completedInCycle: number;
};

const SETTINGS_KEY = "convertify.studyTimer.settings.v1";
const STATS_KEY = "convertify.studyTimer.stats.v1";
const STATE_KEY = "convertify.studyTimer.state.v2";

const DEFAULTS: Settings = {
  focus: 25,
  short: 5,
  long: 15,
  longEvery: 4,
  autoSwitch: true,
  sound: true,
  notifications: false,
};

const DEFAULT_STATE: TimerState = {
  mode: "focus",
  running: false,
  endAt: null,
  pausedRemaining: null,
  completedInCycle: 0,
};

const MOTIVATIONS = [
  "Stay focused — small steps build big results.",
  "Deep work beats long work.",
  "You're in flow. Keep going.",
  "One session at a time.",
  "Discipline today, freedom tomorrow.",
];

const todayStr = () => new Date().toISOString().slice(0, 10);

function loadJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return { ...(fallback as object), ...JSON.parse(raw) } as T;
  } catch {
    return fallback;
  }
}

function loadStats(): Stats {
  try {
    const raw = localStorage.getItem(STATS_KEY);
    if (!raw) return { date: todayStr(), completedFocus: 0, totalFocusSeconds: 0 };
    const s = JSON.parse(raw) as Stats;
    if (s.date !== todayStr()) return { date: todayStr(), completedFocus: 0, totalFocusSeconds: 0 };
    return s;
  } catch {
    return { date: todayStr(), completedFocus: 0, totalFocusSeconds: 0 };
  }
}

function fmt(seconds: number) {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

function playBeep() {
  try {
    const Ctx =
      (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext })
        .AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const beep = (freq: number, start: number, dur: number) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = freq;
      o.type = "sine";
      o.connect(g);
      g.connect(ctx.destination);
      g.gain.setValueAtTime(0.0001, ctx.currentTime + start);
      g.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + start + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + start + dur);
      o.start(ctx.currentTime + start);
      o.stop(ctx.currentTime + start + dur + 0.05);
    };
    beep(880, 0, 0.25);
    beep(660, 0.3, 0.25);
    beep(990, 0.6, 0.35);
    setTimeout(() => ctx.close(), 1500);
  } catch {
    // ignore
  }
}

const StudyTimer = () => {
  const [settings, setSettings] = useState<Settings>(() => loadJSON(SETTINGS_KEY, DEFAULTS));
  const [stats, setStats] = useState<Stats>(loadStats);
  const [state, setState] = useState<TimerState>(() => loadJSON(STATE_KEY, DEFAULT_STATE));
  const [now, setNow] = useState<number>(() => Date.now());
  const [fullscreen, setFullscreen] = useState(false);
  const [motivation] = useState(() => MOTIVATIONS[Math.floor(Math.random() * MOTIVATIONS.length)]);

  const totalForMode = useMemo(() => {
    const m = state.mode === "focus" ? settings.focus : state.mode === "short" ? settings.short : settings.long;
    return Math.max(1, Math.round(m * 60));
  }, [state.mode, settings]);

  // Compute remaining seconds from authoritative source (endAt vs pausedRemaining)
  const remaining = useMemo(() => {
    if (state.running && state.endAt != null) {
      return Math.max(0, Math.round((state.endAt - now) / 1000));
    }
    if (state.pausedRemaining != null) return state.pausedRemaining;
    return totalForMode;
  }, [state, now, totalForMode]);

  // Persist settings, stats, timer state
  useEffect(() => { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); }, [settings]);
  useEffect(() => { localStorage.setItem(STATS_KEY, JSON.stringify(stats)); }, [stats]);
  useEffect(() => { localStorage.setItem(STATE_KEY, JSON.stringify(state)); }, [state]);

  const finishSessionRef = useRef<() => void>(() => {});

  const finishSession = useCallback(() => {
    if (settings.sound) playBeep();
    const finishedMode = state.mode;
    const msg =
      finishedMode === "focus"
        ? "Focus session completed"
        : finishedMode === "short"
        ? "Short break is over"
        : "Long break is over";
    toast({ title: msg, description: settings.autoSwitch ? "Switching to next session." : "Tap start for the next." });
    if (settings.notifications && "Notification" in window && Notification.permission === "granted") {
      try { new Notification("Convertify Study Timer", { body: msg }); } catch { /* ignore */ }
    }

    let nextMode: Mode;
    let nextCompleted = state.completedInCycle;
    if (finishedMode === "focus") {
      setStats((s) => ({
        date: todayStr(),
        completedFocus: (s.date === todayStr() ? s.completedFocus : 0) + 1,
        totalFocusSeconds: (s.date === todayStr() ? s.totalFocusSeconds : 0) + settings.focus * 60,
      }));
      nextCompleted = state.completedInCycle + 1;
      nextMode = nextCompleted % settings.longEvery === 0 ? "long" : "short";
    } else {
      nextMode = "focus";
    }

    const nextDur =
      (nextMode === "focus" ? settings.focus : nextMode === "short" ? settings.short : settings.long) * 60;

    setState({
      mode: nextMode,
      completedInCycle: nextCompleted,
      running: settings.autoSwitch,
      endAt: settings.autoSwitch ? Date.now() + nextDur * 1000 : null,
      pausedRemaining: settings.autoSwitch ? null : nextDur,
    });
  }, [state.mode, state.completedInCycle, settings]);

  finishSessionRef.current = finishSession;

  // Hydrate on mount: if running but endAt already passed (e.g. user closed tab), advance session
  useEffect(() => {
    if (state.running && state.endAt != null && state.endAt <= Date.now()) {
      finishSessionRef.current();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Tick — Date.now() based, immune to setInterval drift
  useEffect(() => {
    if (!state.running || state.endAt == null) return;
    const tick = () => {
      const t = Date.now();
      setNow(t);
      if (state.endAt != null && t >= state.endAt) {
        finishSessionRef.current();
      }
    };
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [state.running, state.endAt]);

  // Re-sync when tab becomes visible again
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "visible") {
        setNow(Date.now());
        if (state.running && state.endAt != null && state.endAt <= Date.now()) {
          finishSessionRef.current();
        }
      }
    };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("focus", onVis);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("focus", onVis);
    };
  }, [state.running, state.endAt]);

  const start = () => {
    if (state.running) return;
    const left = state.pausedRemaining != null ? state.pausedRemaining : totalForMode;
    const safe = left > 0 ? left : totalForMode;
    setState((s) => ({ ...s, running: true, endAt: Date.now() + safe * 1000, pausedRemaining: null }));
    if (settings.notifications && "Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }
  };

  const pause = () => {
    setState((s) => {
      const left = s.endAt != null ? Math.max(0, Math.round((s.endAt - Date.now()) / 1000)) : (s.pausedRemaining ?? totalForMode);
      return { ...s, running: false, endAt: null, pausedRemaining: left };
    });
  };

  const reset = () => {
    setState((s) => ({ ...s, running: false, endAt: null, pausedRemaining: null }));
  };

  const skip = () => {
    finishSessionRef.current();
  };

  const switchMode = (m: Mode) => {
    setState((s) => ({ ...s, mode: m, running: false, endAt: null, pausedRemaining: null }));
  };

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.code === "Space") {
        e.preventDefault();
        state.running ? pause() : start();
      } else if (e.key.toLowerCase() === "r") reset();
      else if (e.key.toLowerCase() === "s") skip();
      else if (e.key.toLowerCase() === "f") setFullscreen((f) => !f);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const progress = Math.min(1, Math.max(0, 1 - remaining / totalForMode));
  const radius = 130;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - progress);
  const modeLabel = state.mode === "focus" ? "Focus" : state.mode === "short" ? "Short Break" : "Long Break";

  const updateSetting = <K extends keyof Settings>(k: K, v: Settings[K]) =>
    setSettings((s) => ({ ...s, [k]: v }));

  const TimerView = (
    <div className="flex w-full flex-col items-center gap-5 sm:gap-6">
      <div className="flex w-full max-w-md flex-wrap justify-center gap-2">
        {(["focus", "short", "long"] as Mode[]).map((m) => (
          <Button
            key={m}
            size="sm"
            variant={state.mode === m ? "default" : "outline"}
            onClick={() => switchMode(m)}
            className="flex-1 min-w-[90px]"
          >
            {m === "focus" ? "Focus" : m === "short" ? "Short Break" : "Long Break"}
          </Button>
        ))}
      </div>

      <div
        className="relative mx-auto aspect-square w-full"
        style={{ maxWidth: "min(82vw, 380px)" }}
      >
        <svg viewBox="0 0 300 300" className="h-full w-full -rotate-90" preserveAspectRatio="xMidYMid meet">
          <circle cx="150" cy="150" r={radius} className="fill-none stroke-muted" strokeWidth="14" />
          <circle
            cx="150"
            cy="150"
            r={radius}
            className="fill-none stroke-primary transition-[stroke-dashoffset] duration-500 ease-linear"
            strokeWidth="14"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center leading-none">
          <span
            className="uppercase tracking-widest text-muted-foreground"
            style={{ fontSize: "clamp(0.625rem, 1.6cqw + 0.5rem, 0.875rem)" }}
          >
            {modeLabel}
          </span>
          <span
            className="mt-2 font-mono font-bold tabular-nums leading-none"
            style={{
              fontSize: "clamp(2rem, 14cqw, 4.5rem)",
              letterSpacing: "-0.02em",
            }}
          >
            {fmt(remaining)}
          </span>
          <span
            className="mt-2 text-muted-foreground"
            style={{ fontSize: "clamp(0.625rem, 1.6cqw + 0.5rem, 0.875rem)" }}
          >
            Session {state.completedInCycle + 1} · {Math.round(progress * 100)}%
          </span>
        </div>
      </div>

      <div className="grid w-full max-w-md grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:justify-center">
        {!state.running ? (
          <Button onClick={start} size="lg" className="col-span-2 gap-2 sm:col-span-1">
            <Play className="h-4 w-4" /> Start
          </Button>
        ) : (
          <Button onClick={pause} size="lg" variant="secondary" className="col-span-2 gap-2 sm:col-span-1">
            <Pause className="h-4 w-4" /> Pause
          </Button>
        )}
        <Button onClick={reset} variant="outline" size="lg" className="gap-2">
          <RotateCcw className="h-4 w-4" /> Reset
        </Button>
        <Button onClick={skip} variant="outline" size="lg" className="gap-2">
          <SkipForward className="h-4 w-4" /> Skip
        </Button>
        <Button onClick={() => setFullscreen((f) => !f)} variant="ghost" size="lg" className="col-span-2 gap-2 sm:col-span-1">
          {fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          {fullscreen ? "Exit" : "Fullscreen"}
        </Button>
      </div>

      <p className="max-w-md px-4 text-center text-sm italic text-muted-foreground">"{motivation}"</p>
      <p className="hidden max-w-md text-center text-xs text-muted-foreground sm:block">
        Shortcuts: <kbd className="rounded bg-muted px-1">Space</kbd> start/pause ·{" "}
        <kbd className="rounded bg-muted px-1">R</kbd> reset · <kbd className="rounded bg-muted px-1">S</kbd> skip ·{" "}
        <kbd className="rounded bg-muted px-1">F</kbd> fullscreen
      </p>
    </div>
  );

  if (fullscreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-background p-4 sm:p-6">
        <div className="w-full max-w-2xl">{TimerView}</div>
      </div>
    );
  }

  return (
    <Layout>
      <div className="container max-w-5xl py-6 md:py-8">
        <ToolPageHeader
          title="Study Timer (Pomodoro)"
          description="Fully customizable focus and break durations with stats, sound, and notifications."
          icon={Timer}
        />

        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <Card>
            <CardContent className="px-4 py-6 sm:px-6 sm:py-8">{TimerView}</CardContent>
          </Card>

          <div className="flex flex-col gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Custom Durations</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {([
                  ["focus", "Focus (minutes)"],
                  ["short", "Short Break (minutes)"],
                  ["long", "Long Break (minutes)"],
                  ["longEvery", "Long break every N focus sessions"],
                ] as const).map(([key, label]) => (
                  <div key={key} className="space-y-1.5">
                    <Label htmlFor={key}>{label}</Label>
                    <Input
                      id={key}
                      type="number"
                      inputMode="numeric"
                      min={1}
                      step={1}
                      value={settings[key]}
                      onChange={(e) => {
                        const v = Math.max(1, Number(e.target.value) || 1);
                        updateSetting(key, v);
                      }}
                    />
                  </div>
                ))}

                <div className="flex items-center justify-between pt-2">
                  <Label htmlFor="autoSwitch">Auto-switch sessions</Label>
                  <Switch
                    id="autoSwitch"
                    checked={settings.autoSwitch}
                    onCheckedChange={(v) => updateSetting("autoSwitch", v)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="sound">Sound alert</Label>
                  <Switch id="sound" checked={settings.sound} onCheckedChange={(v) => updateSetting("sound", v)} />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="notif">Browser notifications</Label>
                  <Switch
                    id="notif"
                    checked={settings.notifications}
                    onCheckedChange={(v) => {
                      updateSetting("notifications", v);
                      if (v && "Notification" in window && Notification.permission === "default") {
                        Notification.requestPermission().catch(() => {});
                      }
                    }}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Today's Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-baseline justify-between">
                  <span className="text-sm text-muted-foreground">Focus sessions</span>
                  <span className="text-2xl font-bold">{stats.completedFocus}</span>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-sm text-muted-foreground">Total study time</span>
                  <span className="text-2xl font-bold">{fmt(stats.totalFocusSeconds)}</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => setStats({ date: todayStr(), completedFocus: 0, totalFocusSeconds: 0 })}
                >
                  Reset today's stats
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default StudyTimer;
