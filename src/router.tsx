import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  // Cached data shows instantly on tab switches; it refreshes quietly in the background.
  const queryClient = new QueryClient({
    defaultOptions: { queries: { staleTime: 30_000, gcTime: 10 * 60_000 } },
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreload: "intent",
    defaultPreloadStaleTime: 0,
  });

  return router;
};
