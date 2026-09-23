import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { getRoomState, type RoomState } from "@/lib/game.functions";

/** Realtime room state + a 1s ticker for the countdown. */
export function useGameState(code: string, playerId?: string) {
  const fetchState = useServerFn(getRoomState);

  const query = useQuery<RoomState>({
    queryKey: ["room", code, playerId ?? "host"],
    queryFn: () => fetchState({ data: { code, playerId } }),
    refetchInterval: 4000,
    retry: 1,
  });

  useEffect(() => {
    const channel = supabase
      .channel(`room-${code}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "rooms" }, () => {
        void query.refetch();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "players" }, () => {
        void query.refetch();
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  return query;
}

export function useCountdown(startedAt: string | null | undefined, timeLimit = 20, active = true) {
  const [remaining, setRemaining] = useState(timeLimit);

  useEffect(() => {
    if (!startedAt || !active) {
      setRemaining(timeLimit);
      return;
    }
    const tick = () => {
      const elapsed = (Date.now() - new Date(startedAt).getTime()) / 1000;
      setRemaining(Math.max(0, Math.ceil(timeLimit - elapsed)));
    };
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [startedAt, timeLimit, active]);

  return remaining;
}

/** Seconds left before a question actually starts (3-2-1 lead-in). 0 = already started. */
export function useLeadIn(startedAt: string | null | undefined) {
  const [lead, setLead] = useState(0);

  useEffect(() => {
    if (!startedAt) {
      setLead(0);
      return;
    }
    const tick = () => {
      const diff = (new Date(startedAt).getTime() - Date.now()) / 1000;
      setLead(diff > 0 ? Math.ceil(diff) : 0);
    };
    tick();
    const id = setInterval(tick, 200);
    return () => clearInterval(id);
  }, [startedAt]);

  return lead;
}
