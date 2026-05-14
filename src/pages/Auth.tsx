import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";

const emailSchema = z.string().trim().email("Invalid email").max(255);
const passwordSchema = z.string().min(6, "Min 6 characters").max(128);

export default function Auth() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");

  useEffect(() => {
    if (user) navigate("/", { replace: true });
  }, [user, navigate]);

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    const ev = emailSchema.safeParse(email);
    const pv = passwordSchema.safeParse(password);
    if (!ev.success || !pv.success) {
      toast({ title: "Invalid input", description: ev.success ? pv.error.issues[0].message : ev.error.issues[0].message, variant: "destructive" });
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast({ title: "Sign in failed", description: error.message, variant: "destructive" });
      return;
    }
    navigate("/");
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    const ev = emailSchema.safeParse(email);
    const pv = passwordSchema.safeParse(password);
    if (!ev.success || !pv.success) {
      toast({ title: "Invalid input", description: ev.success ? pv.error.issues[0].message : ev.error.issues[0].message, variant: "destructive" });
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: { display_name: name || email.split("@")[0] },
      },
    });
    setLoading(false);
    if (error) {
      toast({ title: "Sign up failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Check your email", description: "We sent a confirmation link to verify your account." });
  }

  async function handleGoogle() {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast({ title: "Google sign-in failed", description: result.error.message, variant: "destructive" });
      return;
    }
    if (!result.redirected) navigate("/");
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-background">
      <Link to="/" className="flex items-center gap-2 mb-8 font-bold text-xl">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg gradient-primary shadow-glow">
          <Sparkles className="h-5 w-5 text-primary-foreground" />
        </span>
        <span className="text-gradient">Convertify</span>
      </Link>

      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Welcome</CardTitle>
          <CardDescription>Sign in or create an account to continue.</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="signin">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="signin">Sign in</TabsTrigger>
              <TabsTrigger value="signup">Sign up</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-3">
                <div className="space-y-1">
                  <Label htmlFor="si-email">Email</Label>
                  <Input id="si-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="si-pass">Password</Label>
                  <Input id="si-pass" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Signing in..." : "Sign in"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-3">
                <div className="space-y-1">
                  <Label htmlFor="su-name">Name (optional)</Label>
                  <Input id="su-name" value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="su-email">Email</Label>
                  <Input id="su-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="su-pass">Password</Label>
                  <Input id="su-pass" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Creating..." : "Create account"}
                </Button>
                <p className="text-xs text-muted-foreground text-center">You'll get 20 free credits on signup.</p>
              </form>
            </TabsContent>
          </Tabs>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">Or</span>
            </div>
          </div>

          <Button type="button" variant="outline" className="w-full" onClick={handleGoogle}>
            Continue with Google
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
