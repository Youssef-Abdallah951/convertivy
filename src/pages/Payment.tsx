import { useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import QRCode from "qrcode";
import { Copy, Upload, CheckCircle2, ArrowLeft } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { getPackage, INSTAPAY_HANDLE, INSTAPAY_HOLDER } from "@/lib/packages";
import { toast } from "@/hooks/use-toast";

export default function Payment() {
  const { packageId } = useParams<{ packageId: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const pkg = useMemo(() => (packageId ? getPackage(packageId) : undefined), [packageId]);
  const [qr, setQr] = useState<string>("");
  const [reference, setReference] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    QRCode.toDataURL(`instapay:${INSTAPAY_HANDLE}`, { width: 240, margin: 1 }).then(setQr);
  }, []);

  if (authLoading) return null;
  if (!user) return <Navigate to={`/auth?next=/payment/${packageId}`} replace />;
  if (!pkg) return <Navigate to="/pricing" replace />;

  function copy(text: string) {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied", description: text });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!file && !reference.trim()) {
      toast({ title: "Proof required", description: "Upload a screenshot or enter a reference number.", variant: "destructive" });
      return;
    }
    if (file && file.size > 5 * 1024 * 1024) {
      toast({ title: "File too large", description: "Max 5 MB.", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      let proofPath: string | null = null;
      if (file) {
        const ext = file.name.split(".").pop() || "jpg";
        proofPath = `${user!.id}/${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("payment-proofs")
          .upload(proofPath, file, { contentType: file.type });
        if (upErr) throw upErr;
      }
      const { error } = await supabase.from("payment_requests").insert({
        user_id: user!.id,
        package: pkg!.id,
        credits_amount: pkg!.credits,
        price_egp: pkg!.priceEgp,
        proof_path: proofPath,
        reference_number: reference.trim() || null,
      });
      if (error) throw error;
      setSubmitted(true);
    } catch (err: any) {
      toast({ title: "Submission failed", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container py-16 max-w-xl">
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                <CheckCircle2 className="h-7 w-7 text-primary" />
              </div>
              <CardTitle>Request submitted</CardTitle>
              <CardDescription>
                We received your payment proof. Credits will be added once an admin verifies it (usually within a few hours).
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              <Button onClick={() => navigate("/")}>Back to home</Button>
              <Button variant="outline" onClick={() => navigate("/pricing")}>View packages</Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container py-8 md:py-12 max-w-3xl">
        <Link to="/pricing" className="inline-flex items-center gap-1 text-sm text-muted-foreground mb-4 hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to pricing
        </Link>

        <h1 className="text-2xl md:text-3xl font-bold mb-1">Pay {pkg.priceEgp} EGP via InstaPay</h1>
        <p className="text-muted-foreground mb-6">{pkg.name} — {pkg.unlimited ? "Unlimited 30 days" : `${pkg.credits} credits`}</p>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>1. Send the payment</CardTitle>
              <CardDescription>Open your InstaPay app and pay to:</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-center bg-muted/30 rounded-lg p-4">
                {qr ? <img src={qr} alt="InstaPay QR" className="rounded" /> : <div className="h-[240px] w-[240px]" />}
              </div>
              <div className="space-y-2">
                <div>
                  <Label className="text-xs text-muted-foreground">InstaPay address</Label>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 px-3 py-2 rounded bg-muted text-sm break-all">{INSTAPAY_HANDLE}</code>
                    <Button size="icon" variant="outline" onClick={() => copy(INSTAPAY_HANDLE)}><Copy className="h-4 w-4" /></Button>
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Account holder</Label>
                  <div className="px-3 py-2 rounded bg-muted text-sm">{INSTAPAY_HOLDER}</div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Amount</Label>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 px-3 py-2 rounded bg-muted text-sm font-semibold">{pkg.priceEgp} EGP</code>
                    <Button size="icon" variant="outline" onClick={() => copy(String(pkg.priceEgp))}><Copy className="h-4 w-4" /></Button>
                  </div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Use your InstaPay app to send exactly {pkg.priceEgp} EGP to the address above. Save the screenshot.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>2. Submit your proof</CardTitle>
              <CardDescription>Upload a screenshot or paste the transaction reference.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={submit} className="space-y-4">
                <div>
                  <Label htmlFor="ref">Reference number (optional)</Label>
                  <Input
                    id="ref"
                    placeholder="e.g. TX1234567890"
                    value={reference}
                    onChange={(e) => setReference(e.target.value.slice(0, 100))}
                  />
                </div>
                <div>
                  <Label>Payment screenshot</Label>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  />
                  <Button type="button" variant="outline" className="w-full" onClick={() => fileRef.current?.click()}>
                    <Upload className="h-4 w-4 mr-2" />
                    {file ? file.name : "Upload screenshot"}
                  </Button>
                  <p className="text-xs text-muted-foreground mt-1">PNG/JPG, max 5 MB.</p>
                </div>
                <Textarea readOnly value={`Package: ${pkg.name}\nAmount: ${pkg.priceEgp} EGP\nUser: ${user.email}`} className="font-mono text-xs h-20" />
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? "Submitting..." : "Submit payment proof"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
