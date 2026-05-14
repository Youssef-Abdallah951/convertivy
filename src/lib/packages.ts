export type PackageId = "starter" | "basic" | "pro" | "unlimited";

export type CreditPackage = {
  id: PackageId;
  name: string;
  credits: number; // 0 for unlimited
  priceEgp: number;
  description: string;
  unlimited?: boolean;
  badge?: string;
};

export const PACKAGES: CreditPackage[] = [
  {
    id: "starter",
    name: "Starter",
    credits: 50,
    priceEgp: 99,
    description: "Perfect for trying out the tools.",
  },
  {
    id: "basic",
    name: "Basic",
    credits: 150,
    priceEgp: 249,
    description: "Great value for regular use.",
    badge: "Popular",
  },
  {
    id: "pro",
    name: "Pro",
    credits: 500,
    priceEgp: 499,
    description: "Best value per credit.",
  },
  {
    id: "unlimited",
    name: "Unlimited Monthly",
    credits: 0,
    priceEgp: 799,
    description: "Unlimited usage for 30 days.",
    unlimited: true,
    badge: "Best",
  },
];

export const INSTAPAY_HANDLE = "yb109324@gmail.com";
export const INSTAPAY_HOLDER = "Convertify";

export function getPackage(id: string): CreditPackage | undefined {
  return PACKAGES.find((p) => p.id === id);
}
