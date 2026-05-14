import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export type UserCredits = {
  credits: number;
  unlimited_until: string | null;
  isUnlimited: boolean;
};

export function useUserCredits() {
  const { user } = useAuth();
  const [data, setData] = useState<UserCredits | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) {
      setData(null);
      setLoading(false);
      return;
    }
    const { data: row } = await supabase
      .from("user_credits")
      .select("credits, unlimited_until")
      .eq("user_id", user.id)
      .maybeSingle();
    if (row) {
      const isUnlimited =
        !!row.unlimited_until && new Date(row.unlimited_until) > new Date();
      setData({ credits: row.credits, unlimited_until: row.unlimited_until, isUnlimited });
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { credits: data, loading, refresh };
}
