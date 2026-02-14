import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import type { InsertApp } from "@shared/schema";
import { withAuthHeaders } from "@/lib/auth";

function getAutoRefetchIntervalMs(): number | false {
  const env = (import.meta as any).env ?? {};
  const raw = env.VITE_AUTO_TIME;
  const minutes = raw === undefined || raw === null || raw === "" ? 1 : Number(raw);
  if (!Number.isFinite(minutes) || minutes <= 0) return false;
  return minutes * 60 * 1000;
}

// List all apps - public (no auth required)
export function useApps() {
  const refetchInterval = getAutoRefetchIntervalMs();
  return useQuery({
    queryKey: [api.apps.list.path],
    queryFn: async () => {
      const res = await fetch(api.apps.list.path);
      if (!res.ok) throw new Error("Failed to fetch apps");
      return api.apps.list.responses[200].parse(await res.json());
    },
    refetchInterval,
  });
}

// Get single app details - public (no auth required)
export function useApp(internalName: string) {
  return useQuery({
    queryKey: [api.apps.get.path, internalName],
    queryFn: async () => {
      const url = buildUrl(api.apps.get.path, { internal_name: internalName });
      const res = await fetch(url);
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch app details");
      return api.apps.get.responses[200].parse(await res.json());
    },
  });
}

// Get app status history - public, last N hours (for charts)
export function useAppStatus(internalName: string, hours = 24) {
  const refetchInterval = getAutoRefetchIntervalMs();
  return useQuery({
    queryKey: [api.apps.getStatus.path, internalName, "hours", hours],
    queryFn: async () => {
      const url = buildUrl(api.apps.getStatus.path, { internal_name: internalName });
      const res = await fetch(`${url}?hours=${hours}`);
      if (!res.ok) throw new Error("Failed to fetch app status history");
      return api.apps.getStatus.responses[200].parse(await res.json());
    },
    refetchInterval,
  });
}

// Last N checks (for Recent Activity table)
export function useAppStatusRecent(internalName: string, limit = 20) {
  const refetchInterval = getAutoRefetchIntervalMs();
  return useQuery({
    queryKey: [api.apps.getStatus.path, internalName, "limit", limit],
    queryFn: async () => {
      const url = buildUrl(api.apps.getStatus.path, { internal_name: internalName });
      const res = await fetch(`${url}?limit=${limit}`);
      if (!res.ok) throw new Error("Failed to fetch recent checks");
      return api.apps.getStatus.responses[200].parse(await res.json());
    },
    refetchInterval,
  });
}

// Get app stats - public (no auth required), last N hours
export function useAppStats(internalName: string, hours = 24) {
  const refetchInterval = getAutoRefetchIntervalMs();
  return useQuery({
    queryKey: [api.apps.getStats.path, internalName, hours],
    queryFn: async () => {
      const url = buildUrl(api.apps.getStats.path, { internal_name: internalName });
      const res = await fetch(`${url}?hours=${hours}`);
      if (!res.ok) throw new Error("Failed to fetch app stats");
      return api.apps.getStats.responses[200].parse(await res.json());
    },
    refetchInterval,
  });
}

// Create new app
export function useCreateApp() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: InsertApp) => {
      try {
        const res = await fetch(api.apps.create.path, {
          method: api.apps.create.method,
          headers: withAuthHeaders({ "Content-Type": "application/json" }),
          body: JSON.stringify(data),
        });
        if (!res.ok) {
          if (res.status === 401) {
            throw new Error("Unauthorized: set KEY_ACCESS/VITE_KEY_ACCESS (or enter it when prompted) and restart dev server.");
          }
          if (res.status === 400) {
            const error = api.apps.create.responses[400].parse(await res.json());
            throw new Error(error.message);
          }
          throw new Error("Failed to create app");
        }
        return api.apps.create.responses[201].parse(await res.json());
      } catch (err: any) {
        if (err.message?.includes("non ISO-8859-1") || err.message?.includes("headers")) {
          throw new Error("KEY_ACCESS contains invalid characters. Use only ASCII characters (English letters, numbers, symbols like - _ .). Clear localStorage KEY_ACCESS and try again.");
        }
        throw err;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.apps.list.path] });
    },
  });
}

// Manual Check Trigger
export function useTriggerCheck() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (internalName: string) => {
      try {
        const url = buildUrl(api.apps.check.path, { internal_name: internalName });
        const res = await fetch(url, {
          method: api.apps.check.method,
          headers: withAuthHeaders(),
        });
        if (!res.ok) {
          if (res.status === 401) {
            throw new Error("Unauthorized: set KEY_ACCESS/VITE_KEY_ACCESS (or enter it when prompted).");
          }
          throw new Error("Failed to trigger check");
        }
        return api.apps.check.responses[200].parse(await res.json());
      } catch (err: any) {
        if (err.message?.includes("non ISO-8859-1") || err.message?.includes("headers")) {
          throw new Error("KEY_ACCESS contains invalid characters. Use only ASCII characters. Clear localStorage KEY_ACCESS and try again.");
        }
        throw err;
      }
    },
    onSuccess: (_, internalName) => {
      queryClient.invalidateQueries({ queryKey: [api.apps.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.apps.getStatus.path, internalName] });
      queryClient.invalidateQueries({ queryKey: [api.apps.getStats.path, internalName] });
    },
  });
}

// Delete App
export function useDeleteApp() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (internalName: string) => {
      try {
        const url = buildUrl(api.apps.delete.path, { internal_name: internalName });
        const res = await fetch(url, {
          method: api.apps.delete.method,
          headers: withAuthHeaders(),
        });
        if (!res.ok) {
          if (res.status === 401) {
            throw new Error("Unauthorized: set KEY_ACCESS/VITE_KEY_ACCESS (or enter it when prompted).");
          }
          throw new Error("Failed to delete app");
        }
      } catch (err: any) {
        if (err.message?.includes("non ISO-8859-1") || err.message?.includes("headers")) {
          throw new Error("KEY_ACCESS contains invalid characters. Use only ASCII characters. Clear localStorage KEY_ACCESS and try again.");
        }
        throw err;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.apps.list.path] });
    },
  });
}
