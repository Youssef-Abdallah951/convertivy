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
  focus: number; // minutes
  short: number;
  long: number;
  longEvery: number; // every N focus sessions trigger a long break
  autoSwitch: boolean;
  sound: boolean;
  notifications: boolean;
};

type Stats = {
  date: string; // YYYY-MM-DD
  completedFocus: number;
  totalFocusSeconds: number;
};

const SETTINGS_KEY = "convertify.studyTimer.settings.v1";
const STATS_KEY = "convertify.studyTimer.stats.v1";

const DEFAULTS: Settings = {
  focus: 25,
  short: 5,
  long: 15,
  longEvery: 4,
  autoSwitch: true,
  sound: true,
  notifications: false,
};

const MOTIVATIONS = [
  "Stay focused — small steps build big results.",
  "Deep work beats long work.",
  "You're in flow. Keep going.",
  "One session at a time.",
  "Discipline today, freedom tomorrow.",
];

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return DEFAULTS;
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
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const [stats, setStats] = useState<Stats>(loadStats);
  const [mode, setMode] = useState<Mode>("focus");
  const [running, setRunning] = useState(false);
  const [endAt, setEndAt] = useState<number | null>(null); // epoch ms
  const [remaining, setRemaining] = useState<number>(settings.focus * 60); // seconds
  const [completedInCycle, setCompletedInCycle] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const [motivation] = useState(() => MOTIVATIONS[Math.floor(Math.random() * MOTIVATIONS.length)]);

  const totalForMode = useMemo(() => {
    const m = mode === "focus" ? settings.focus : mode === "short" ? settings.short : settings.long;
    return Math.max(1, Math.round(m * 60));
  }, [mode, settings]);

  // Persist settings
  useEffect(() => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }, [settings]);

  // Persist stats
  useEffect(() => {
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  }, [stats]);

  // Reset remaining when mode/settings change while not running
  useEffect(() => {
    if (!running) setRemaining(totalForMode);
  }, [totalForMode, running]);

  const finishSessionRef = useRef<() => void>(() => {});

  const finishSession = useCallback(() => {
    setRunning(false);
    setEndAt(null);
    if (settings.sound) playBeep();
    const msg =
      mode === "focus" ? "Focus session completed" : mode === "short" ? "Short break is over" : "Long break is over";
    toast({ title: msg, description: settings.autoSwitch ? "Switching to next session." : "Tap start for the next." });
    if (settings.notifications && "Notification" in window && Notification.permission === "granted") {
      try {
        new Notification("Convertify Study Timer", { body: msg });
      } catch {
        // ignore
      }
    }

    if (mode === "focus") {
      setStats((s) => ({
        ...s,
        date: todayStr(),
        completedFocus: s.completedFocus + 1,
        totalFocusSeconds: s.totalFocusSeconds + settings.focus * 60,
      }));
      const next = completedInCycle + 1;
      setCompletedInCycle(next);
      const nextMode: Mode = next % settings.longEvery === 0 ? "long" : "short";
      setMode(nextMode);
      const nextDur = (nextMode === "long" ? settings.long : settings.short) * 60;
      setRemaining(nextDur);
      if (settings.autoSwitch) {
        setEndAt(Date.now() + nextDur * 1000);
        setRunning(true);
      }
    } else {
      setMode("focus");
      const nextDur = settings.focus * 60;
      setRemaining(nextDur);
      if (settings.autoSwitch) {
        setEndAt(Date.now() + nextDur * 1000);
        setRunning(true);
      }
    }
  }, [mode, settings, completedInCycle]);

  finishSessionRef.current = finishSession;

  // Tick using endAt to remain accurate across tab throttling
  useEffect(() => {
    if (!running || endAt == null) return;
    const id = setInterval(() => {
      const left = Math.round((endAt - Date.now()) / 1000);
      if (left <= 0) {
        setRemaining(0);
        finishSessionRef.current();
      } else {
        setRemaining(left);
      }
    }, 250);
    return () => clearInterval(id);
  }, [running, endAt]);

  const start = () => {
    if (running) return;
    const left = remaining > 0 ? remaining : totalForMode;
    setEndAt(Date.now() + left * 1000);
    setRemaining(left);
    setRunning(true);
    if (settings.notifications && "Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }
  };

  const pause = () => {
    setRunning(false);
    setEndAt(null);
  };

  const reset = () => {
    setRunning(false);
    setEndAt(null);
    setRemaining(totalForMode);
  };

  const skip = () => {
    setRunning(false);
    setEndAt(null);
    finishSessionRef.current();
  };

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.code === "Space") {
        e.preventDefault();
        running ? pause() : start();
      } else if (e.key.toLowerCase() === "r") {
        reset();
      } else if (e.key.toLowerCase() === "s") {
        skip();
      } else if (e.key.toLowerCase() === "f") {
        setFullscreen((f) => !f);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const progress = 1 - remaining / totalForMode;
  const radius = 130;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - progress);

  const modeLabel = mode === "focus" ? "Focus" : mode === "short" ? "Short Break" : "Long Break";

  const updateSetting = <K extends keyof Settings>(k: K, v: Settings[K]) =>
    setSettings((s) => ({ ...s, [k]: v }));

  const TimerView = (
    <div className="flex flex-col items-center gap-6">
      <div className="flex gap-2">
        {(["focus", "short", "long"] as Mode[]).map((m) => (
          <Button
            key={m}
            size="sm"
            variant={mode === m ? "default" : "outline"}
            onClick={() => {
              setRunning(false);
              setEndAt(null);
              setMode(m);
            }}
          >
            {m === "focus" ? "Focus" : m === "short" ? "Short Break" : "Long Break"}
          </Button>
        ))}
      </div>

      <div className="relative">
        <svg width="300" height="300" className="-rotate-90">
          <circle cx="150" cy="150" r={radius} className="fill-none stroke-muted" strokeWidth="14" />
          <circle
            cx="150"
            cy="150"
            r={radius}
            className="fill-none stroke-primary transition-[stroke-dashoffset] duration-300"
            strokeWidth="14"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xs uppercase tracking-widest text-muted-foreground">{modeLabel}</span>
          <span className="mt-2 font-mono text-5xl font-bold tabular-nums md:text-6xl">{fmt(remaining)}</span>
          <span className="mt-2 text-xs text-muted-foreground">
            Session {completedInCycle + 1} · {Math.round(progress * 100)}%
          </span>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2">
        {!running ? (
          <Button onClick={start} size="lg" className="gap-2">
            <Play className="h-4 w-4" /> Start
          </Button>
        ) : (
          <Button onClick={pause} size="lg" variant="secondary" className="gap-2">
            <Pause className="h-4 w-4" /> Pause
          </Button>
        )}
        <Button onClick={reset} variant="outline" className="gap-2">
          <RotateCcw className="h-4 w-4" /> Reset
        </Button>
        <Button onClick={skip} variant="outline" className="gap-2">
          <SkipForward className="h-4 w-4" /> Skip
        </Button>
        <Button onClick={() => setFullscreen((f) => !f)} variant="ghost" className="gap-2">
          {fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          {fullscreen ? "Exit" : "Fullscreen"}
        </Button>
      </div>

      <p className="max-w-md text-center text-sm italic text-muted-foreground">"{motivation}"</p>
      <p className="text-xs text-muted-foreground">
        Shortcuts: <kbd className="rounded bg-muted px-1">Space</kbd> start/pause ·{" "}
        <kbd className="rounded bg-muted px-1">R</kbd> reset · <kbd className="rounded bg-muted px-1">S</kbd> skip ·{" "}
        <kbd className="rounded bg-muted px-1">F</kbd> fullscreen
      </p>
    </div>
  );

  if (fullscreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background p-6">
        {TimerView}
      </div>
    );
  }

  return (
    <Layout>
      <div className="container max-w-5xl py-8">
        <ToolPageHeader
          title="Study Timer (Pomodoro)"
          description="Fully customizable focus and break durations with stats, sound, and notifications."
          icon={Timer}
        />

        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <Card>
            <CardContent className="py-8">{TimerView}</CardContent>
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
                  onClick={() =>
                    setStats({ date: todayStr(), completedFocus: 0, totalFocusSeconds: 0 })
                  }
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
