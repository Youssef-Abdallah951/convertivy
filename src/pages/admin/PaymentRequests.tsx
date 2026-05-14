import { useEffect, useState, useCallback } from "react";
import { Navigate } from "react-router-dom";
import { Check, X, Loader2, ImageIcon } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";

type Request = {
  id: string;
  user_id: string;
  package: string;
  credits_amount: number;
  price_egp: number;
  proof_path: string | null;
  reference_number: string | null;
  status: "pending" | "approved" | "rejected";
  admin_notes: string | null;
  created_at: string;
  reviewed_at: string | null;
};

export default function AdminPaymentRequests() {
  const { user, isAdmin, loading } = useAuth();
  const [rows, setRows] = useState<Request[]>([]);
  const [working, setWorking] = useState<string | null>(null);
  const [emails, setEmails] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("payment_requests")
      .select("*")
      .order("created_at", { ascending: false });
    setRows((data as Request[]) ?? []);
    if (data?.length) {
      const ids = Array.from(new Set(data.map((r) => r.user_id)));
      const { data: profs } = await supabase.from("profiles").select("user_id,email").in("user_id", ids);
      const map: Record<string, string> = {};
      profs?.forEach((p: any) => { map[p.user_id] = p.email; });
      setEmails(map);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin, load]);

  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;
  if (!isAdmin) return <Navigate to="/" replace />;

  async function approve(id: string) {
    setWorking(id);
    const { error } = await supabase.rpc("approve_payment_request", { _request_id: id, _notes: null });
    setWorking(null);
    if (error) {
      toast({ title: "Failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Approved", description: "Credits added to user." });
    load();
  }

  async function reject(id: string) {
    setWorking(id);
    const { error } = await supabase.rpc("reject_payment_request", { _request_id: id, _notes: null });
    setWorking(null);
    if (error) {
      toast({ title: "Failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Rejected" });
    load();
  }

  async function viewProof(path: string) {
    const { data } = await supabase.storage.from("payment-proofs").createSignedUrl(path, 60);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  }

  const groups = {
    pending: rows.filter((r) => r.status === "pending"),
    approved: rows.filter((r) => r.status === "approved"),
    rejected: rows.filter((r) => r.status === "rejected"),
  };

  function renderRow(r: Request) {
    return (
      <Card key={r.id}>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <CardTitle className="text-base capitalize">{r.package} — {r.price_egp} EGP</CardTitle>
              <CardDescription>
                {emails[r.user_id] || r.user_id.slice(0, 8)} · {new Date(r.created_at).toLocaleString()}
              </CardDescription>
            </div>
            <Badge variant={r.status === "approved" ? "default" : r.status === "rejected" ? "destructive" : "secondary"}>
              {r.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-sm grid sm:grid-cols-2 gap-2">
            <div><span className="text-muted-foreground">Credits:</span> {r.credits_amount || "Unlimited"}</div>
            <div><span className="text-muted-foreground">Reference:</span> {r.reference_number || "—"}</div>
          </div>
          <div className="flex flex-wrap gap-2">
            {r.proof_path && (
              <Button size="sm" variant="outline" onClick={() => viewProof(r.proof_path!)}>
                <ImageIcon className="h-4 w-4 mr-1" /> View proof
              </Button>
            )}
            {r.status === "pending" && (
              <>
                <Button size="sm" onClick={() => approve(r.id)} disabled={working === r.id}>
                  {working === r.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4 mr-1" />}
                  Approve
                </Button>
                <Button size="sm" variant="destructive" onClick={() => reject(r.id)} disabled={working === r.id}>
                  <X className="h-4 w-4 mr-1" /> Reject
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container py-8 max-w-4xl">
        <h1 className="text-2xl md:text-3xl font-bold mb-1">Payment requests</h1>
        <p className="text-muted-foreground mb-6">Verify InstaPay payments and approve credits.</p>

        <Tabs defaultValue="pending">
          <TabsList>
            <TabsTrigger value="pending">Pending ({groups.pending.length})</TabsTrigger>
            <TabsTrigger value="approved">Approved ({groups.approved.length})</TabsTrigger>
            <TabsTrigger value="rejected">Rejected ({groups.rejected.length})</TabsTrigger>
          </TabsList>
          {(["pending", "approved", "rejected"] as const).map((k) => (
            <TabsContent key={k} value={k} className="space-y-3 mt-4">
              {groups[k].length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">No {k} requests.</p>
              ) : (
                groups[k].map(renderRow)
              )}
            </TabsContent>
          ))}
        </Tabs>
      </main>
    </div>
  );
}
