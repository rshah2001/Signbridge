import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { getHealth } from "../lib/api";

const AppHealthContext = createContext({
  health: null,
  loading: true,
  error: null,
  refresh: async () => {},
});

export function AppHealthProvider({ children }) {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refresh = async () => {
    setLoading(true);
    try {
      const data = await getHealth();
      setHealth(data);
      setError(null);
    } catch (err) {
      setError(err?.message || "Unable to reach backend health endpoint.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    const intervalId = window.setInterval(refresh, 30000);
    return () => window.clearInterval(intervalId);
  }, []);

  const value = useMemo(
    () => ({ health, loading, error, refresh }),
    [error, health, loading],
  );

  return <AppHealthContext.Provider value={value}>{children}</AppHealthContext.Provider>;
}

export function useAppHealth() {
  return useContext(AppHealthContext);
}
