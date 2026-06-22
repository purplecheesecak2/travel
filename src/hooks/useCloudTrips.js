// src/hooks/useCloudTrips.js
import { useState, useEffect, useRef, useCallback } from "react";
import {
  authApi,
  listTrips,
  createTrip as apiCreate,
  updateTrip as apiUpdate,
  deleteTrip as apiDelete,
  joinByToken,
  subscribeTrips,
} from "../lib/cloudStore";

export function useCloudTrips() {
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [trips, setTrips] = useState({});
  const [ready, setReady] = useState(false);

  const saveTimers = useRef({});
  const localEdits = useRef({});

  useEffect(() => {
    let sub;
    authApi.getUser().then((u) => {
      setUser(u);
      setAuthReady(true);
    });
    const { data } = authApi.onChange((u) => setUser(u));
    sub = data?.subscription;
    return () => sub?.unsubscribe?.();
  }, []);

  const refresh = useCallback(async () => {
    try {
      const server = await listTrips();
      setTrips((prev) => {
        const merged = { ...server };
        Object.keys(prev).forEach((id) => {
          const localTs = localEdits.current[id] || 0;
          const serverTs = merged[id]?.updatedAt || 0;
          if (merged[id] && localTs > serverTs) merged[id] = prev[id];
        });
        return merged;
      });
    } catch (e) {
      console.error("[useCloudTrips] refresh 실패", e);
    }
  }, []);

  useEffect(() => {
    if (!user) {
      setTrips({});
      setReady(true);
      return;
    }
    setReady(false);
    refresh().then(() => setReady(true));
    const unsub = subscribeTrips(refresh);
    return () => unsub && unsub();
  }, [user, refresh]);

  const createTrip = useCallback(async (data) => {
    const t = await apiCreate(data);
    setTrips((p) => ({ ...p, [t.id]: t }));
    return t;
  }, []);

  const removeTrip = useCallback(async (id) => {
    setTrips((p) => {
      const n = { ...p };
      delete n[id];
      return n;
    });
    try {
      await apiDelete(id);
    } catch (e) {
      console.error("[useCloudTrips] 삭제 실패", e);
      refresh();
    }
  }, [refresh]);

  const updateActive = useCallback((id, updater) => {
    setTrips((prev) => {
      const cur = prev[id];
      if (!cur) return prev;
      const nt = typeof updater === "function" ? updater(cur) : updater;
      const stamped = { ...nt, id, updatedAt: Date.now() };
      localEdits.current[id] = stamped.updatedAt;

      if (saveTimers.current[id]) clearTimeout(saveTimers.current[id]);
      saveTimers.current[id] = setTimeout(() => {
        apiUpdate(id, stamped).catch((e) => console.error("[useCloudTrips] 저장 실패", e));
      }, 600);

      return { ...prev, [id]: stamped };
    });
  }, []);

  const join = useCallback(async (token) => {
    const id = await joinByToken(token);
    await refresh();
    return id;
  }, [refresh]);

  return {
    user,
    authReady,
    ready,
    trips,
    createTrip,
    removeTrip,
    updateActive,
    join,
    refresh,
    signOut: authApi.signOut,
  };
}