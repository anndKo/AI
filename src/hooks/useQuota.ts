import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface QuotaInfo {
  remaining: number;
  daily_limit: number;
  bonus: number;
  plan_type: string;
  plan_expires_at: string | null;
}

export function useQuota() {
  const { user, isAuthenticated } = useAuth();
  const [quota, setQuota] = useState<QuotaInfo | null>(null);
  const [quotaLoading, setQuotaLoading] = useState(true);
  const [roleLoading, setRoleLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const fetchQuota = useCallback(async () => {
    if (!user) {
      setQuota(null);
      setQuotaLoading(false);
      return;
    }

    setQuotaLoading(true);
    try {
      const { data, error } = await supabase.rpc("get_remaining_quota", {
        _user_id: user.id,
      });

      if (error) throw error;
      setQuota(data as unknown as QuotaInfo);
    } catch (error) {
      console.error("Error fetching quota:", error);
      setQuota(null);
    } finally {
      setQuotaLoading(false);
    }
  }, [user]);

  const checkAdmin = useCallback(async () => {
    if (!user) {
      setIsAdmin(false);
      setRoleLoading(false);
      return;
    }

    setRoleLoading(true);
    try {
      const { data, error } = await supabase.rpc("has_role", {
        _user_id: user.id,
        _role: "admin",
      });

      if (error) throw error;
      setIsAdmin(data === true);
    } catch (error) {
      console.error("Error checking admin:", error);
      setIsAdmin(false);
    } finally {
      setRoleLoading(false);
    }
  }, [user]);

  const useOneQuestion = useCallback(async (): Promise<boolean> => {
    if (!user) return true; // Allow non-authenticated users

    try {
      const { data, error } = await supabase.rpc("check_and_use_quota", {
        _user_id: user.id,
      });

      if (error) throw error;

      // Refresh quota after use
      await fetchQuota();

      return data === true;
    } catch (error) {
      console.error("Error using quota:", error);
      return false;
    }
  }, [user, fetchQuota]);

  const canAsk = useCallback((): boolean => {
    if (!isAuthenticated) return true; // Non-authenticated can always ask
    if (!quota) return false;
    return quota.remaining > 0 || quota.bonus > 0;
  }, [isAuthenticated, quota]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchQuota();
      checkAdmin();
    } else {
      setQuota(null);
      setIsAdmin(false);
      setQuotaLoading(false);
      setRoleLoading(false);
    }
  }, [isAuthenticated, fetchQuota, checkAdmin]);

  return {
    quota,
    loading: quotaLoading || roleLoading,
    isAdmin,
    fetchQuota,
    useOneQuestion,
    canAsk,
  };
}
