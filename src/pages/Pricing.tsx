import { Link, useNavigate } from "react-router-dom";
import { Check, Sparkles } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PACKAGES } from "@/lib/packages";
import { useAuth } from "@/hooks/useAuth";
import { useUserCredits } from "@/hooks/useUserCredits";

export default function Pricing() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { credits } = useUserCredits();

  function choose(id: string) {
    if (!user) {
      navigate(`/auth?next=/payment/${id}`);
    } else {
      navigate(`/payment/${id}`);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container py-10 md:py-16">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <h1 className="text-3xl md:text-5xl font-bold mb-4">
            Buy credits with <span className="text-gradient">InstaPay</span>
          </h1>
          <p className="text-muted-foreground">
            Pay in EGP via InstaPay. Upload your payment proof and credits are added after admin approval.
          </p>
          {credits && (
            <div className="mt-4 inline-flex items-center gap-2 rounded-full border bg-card px-4 py-2 text-sm">
              <Sparkles className="h-4 w-4 text-primary" />
              {credits.isUnlimited ? "Unlimited active" : `Balance: ${credits.credits} credits`}
            </div>
          )}
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {PACKAGES.map((p) => (
            <Card key={p.id} className={p.badge ? "border-primary shadow-glow relative" : "relative"}>
              {p.badge && (
                <Badge className="absolute -top-2 left-1/2 -translate-x-1/2">{p.badge}</Badge>
              )}
              <CardHeader>
                <CardTitle>{p.name}</CardTitle>
                <CardDescription>{p.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="text-3xl font-bold">
                    {p.priceEgp} <span className="text-sm font-normal text-muted-foreground">EGP{p.unlimited ? "/mo" : ""}</span>
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    {p.unlimited ? "Unlimited usage" : `${p.credits} credits`}
                  </div>
                </div>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> All Convertify tools</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> Pay via InstaPay</li>
                  {p.unlimited && (
                    <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> 30 days unlimited</li>
                  )}
                </ul>
                <Button className="w-full" onClick={() => choose(p.id)}>
                  Choose {p.name}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <p className="text-center text-sm text-muted-foreground mt-10">
          Need help? <Link to="/" className="underline">Back to home</Link>
        </p>
      </main>
    </div>
  );
}
