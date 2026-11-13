import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getCoordinatorStatus } from "@/lib/api/requests.functions";

/** Client-only: whether a session exists, and whether that user is a coordinator/admin. */
export function useCoordinator() {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => active && setSignedIn(!!data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSignedIn(!!s));
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);
  const q = useQuery({
    queryKey: ["coordinator-status"],
    queryFn: () => getCoordinatorStatus(),
    enabled: signedIn === true,
    retry: false,
  });
  return {
    signedIn,
    coordinator: q.data?.coordinator === true,
    checking: signedIn === null || q.isLoading,
  };
}
