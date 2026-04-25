import { useMemo, useState } from "react";
import { ArrowLeftRight } from "lucide-react";
import { Layout } from "@/components/Layout";
import { ToolPageHeader } from "@/components/ToolPageHeader";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { tools } from "@/lib/tools";

const tool = tools.find((t) => t.slug === "unit-converter")!;

type CategoryKey = "length" | "weight" | "temperature" | "time" | "speed" | "data";

type Unit = { value: string; label: string };

// All non-temperature categories use a "factor to base unit" approach.
const CATEGORIES: Record<
  CategoryKey,
  { label: string; units: Unit[]; factors?: Record<string, number> }
> = {
  length: {
    label: "Length",
    units: [
      { value: "m", label: "Meter (m)" },
      { value: "km", label: "Kilometer (km)" },
      { value: "cm", label: "Centimeter (cm)" },
      { value: "mm", label: "Millimeter (mm)" },
      { value: "in", label: "Inch (in)" },
      { value: "ft", label: "Foot (ft)" },
    ],
    // base: meter
    factors: { m: 1, km: 1000, cm: 0.01, mm: 0.001, in: 0.0254, ft: 0.3048 },
  },
  weight: {
    label: "Weight",
    units: [
      { value: "kg", label: "Kilogram (kg)" },
      { value: "g", label: "Gram (g)" },
      { value: "lb", label: "Pound (lb)" },
      { value: "oz", label: "Ounce (oz)" },
    ],
    // base: gram
    factors: { kg: 1000, g: 1, lb: 453.59237, oz: 28.349523125 },
  },
  temperature: {
    label: "Temperature",
    units: [
      { value: "C", label: "Celsius (°C)" },
      { value: "F", label: "Fahrenheit (°F)" },
      { value: "K", label: "Kelvin (K)" },
    ],
  },
  time: {
    label: "Time",
    units: [
      { value: "s", label: "Seconds (s)" },
      { value: "min", label: "Minutes (min)" },
      { value: "h", label: "Hours (h)" },
      { value: "d", label: "Days (d)" },
    ],
    // base: second
    factors: { s: 1, min: 60, h: 3600, d: 86400 },
  },
  speed: {
    label: "Speed",
    units: [
      { value: "kmh", label: "Kilometers per hour (km/h)" },
      { value: "ms", label: "Meters per second (m/s)" },
      { value: "mph", label: "Miles per hour (mph)" },
    ],
    // base: m/s
    factors: { ms: 1, kmh: 1000 / 3600, mph: 1609.344 / 3600 },
  },
  data: {
    label: "Data",
    units: [
      { value: "B", label: "Bytes (B)" },
      { value: "KB", label: "Kilobytes (KB)" },
      { value: "MB", label: "Megabytes (MB)" },
      { value: "GB", label: "Gigabytes (GB)" },
    ],
    // base: byte (decimal — 1 KB = 1000 B)
    factors: { B: 1, KB: 1000, MB: 1_000_000, GB: 1_000_000_000 },
  },
};

function convertTemperature(value: number, from: string, to: string): number {
  // Normalize to Celsius first
  let celsius: number;
  switch (from) {
    case "C":
      celsius = value;
      break;
    case "F":
      celsius = (value - 32) * (5 / 9);
      break;
    case "K":
      celsius = value - 273.15;
      break;
    default:
      celsius = value;
  }
  switch (to) {
    case "C":
      return celsius;
    case "F":
      return celsius * (9 / 5) + 32;
    case "K":
      return celsius + 273.15;
    default:
      return celsius;
  }
}

function formatResult(num: number): string {
  if (!Number.isFinite(num)) return "";
  if (num === 0) return "0";
  const abs = Math.abs(num);
  if (abs >= 1e12 || abs < 1e-6) return num.toExponential(6);
  // Up to 8 significant decimals, then trim trailing zeros
  return Number(num.toFixed(8)).toString();
}

const UnitConverter = () => {
  const [category, setCategory] = useState<CategoryKey>("length");
  const [fromUnit, setFromUnit] = useState<string>(CATEGORIES.length.units[0].value);
  const [toUnit, setToUnit] = useState<string>(CATEGORIES.length.units[1].value);
  const [input, setInput] = useState<string>("1");

  const handleCategoryChange = (next: CategoryKey) => {
    setCategory(next);
    const units = CATEGORIES[next].units;
    setFromUnit(units[0].value);
    setToUnit(units[1]?.value ?? units[0].value);
  };

  const swap = () => {
    setFromUnit(toUnit);
    setToUnit(fromUnit);
  };

  const { result, error } = useMemo(() => {
    if (input.trim() === "") return { result: "", error: "" };
    const value = Number(input);
    if (Number.isNaN(value)) return { result: "", error: "Please enter a valid number." };

    const cat = CATEGORIES[category];
    const validUnits = cat.units.map((u) => u.value);
    if (!validUnits.includes(fromUnit) || !validUnits.includes(toUnit)) {
      return { result: "", error: "Selected units don't match the category." };
    }

    let converted: number;
    if (category === "temperature") {
      converted = convertTemperature(value, fromUnit, toUnit);
    } else {
      const factors = cat.factors!;
      const base = value * factors[fromUnit];
      converted = base / factors[toUnit];
    }

    return { result: formatResult(converted), error: "" };
  }, [input, fromUnit, toUnit, category]);

  const units = CATEGORIES[category].units;

  return (
    <Layout>
      <div className="container max-w-3xl py-10 md:py-14">
        <ToolPageHeader title={tool.title} description={tool.description} icon={tool.icon} />

        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm md:p-8">
          {/* Category */}
          <div className="mb-6">
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Category
            </label>
            <Select value={category} onValueChange={(v) => handleCategoryChange(v as CategoryKey)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(CATEGORIES) as CategoryKey[]).map((key) => (
                  <SelectItem key={key} value={key}>
                    {CATEGORIES[key].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4 md:grid-cols-[1fr_auto_1fr] md:items-end">
            {/* From */}
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                From
              </label>
              <Input
                type="number"
                inputMode="decimal"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Enter value"
                className="mb-2 text-lg"
              />
              <Select value={fromUnit} onValueChange={setFromUnit}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {units.map((u) => (
                    <SelectItem key={u.value} value={u.value}>
                      {u.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Swap */}
            <div className="flex items-center justify-center md:pb-1">
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={swap}
                aria-label="Swap units"
                className="rounded-full"
              >
                <ArrowLeftRight className="h-4 w-4" />
              </Button>
            </div>

            {/* To */}
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                To
              </label>
              <div className="mb-2 flex h-10 items-center rounded-md border border-input bg-muted/40 px-3 text-lg font-semibold text-foreground">
                {error ? <span className="text-sm font-normal text-muted-foreground">—</span> : result || <span className="text-sm font-normal text-muted-foreground">—</span>}
              </div>
              <Select value={toUnit} onValueChange={setToUnit}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {units.map((u) => (
                    <SelectItem key={u.value} value={u.value}>
                      {u.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {error && (
            <p className="mt-4 text-sm text-destructive">{error}</p>
          )}

          {!error && result && input.trim() !== "" && (
            <p className="mt-6 rounded-xl bg-muted/40 p-4 text-center text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">{input}</span>{" "}
              {units.find((u) => u.value === fromUnit)?.label.match(/\(([^)]+)\)/)?.[1] ?? fromUnit}{" "}
              =
              <span className="ml-1 font-semibold text-foreground">{result}</span>{" "}
              {units.find((u) => u.value === toUnit)?.label.match(/\(([^)]+)\)/)?.[1] ?? toUnit}
            </p>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default UnitConverter;
