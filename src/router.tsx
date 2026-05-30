import { createRootRoute, createRoute, createRouter, Link, Outlet } from "@tanstack/react-router";
import { BucketPage } from "./routes/BucketPage";
import { DashboardPage } from "./routes/DashboardPage";

function RootLayout() {
  return (
    <div className="mx-auto min-h-screen w-full max-w-7xl px-4 py-4 text-zinc-100 sm:px-6">
      <header className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Link to="/" className="inline-flex items-center gap-3" aria-label="Multy R2 home">
          <span className="grid size-10 place-items-center rounded-2xl rounded-bl-md bg-amber-300 text-sm font-black text-zinc-950">R2</span>
          <span>
            <strong className="block text-base leading-5 text-zinc-50">Multy</strong>
            <small className="block text-xs uppercase tracking-[0.18em] text-zinc-500">endpoint manager</small>
          </span>
        </Link>
        <div className="inline-flex w-fit items-center gap-2 rounded-full border border-zinc-800 bg-zinc-950/70 px-3 py-2 text-xs text-zinc-400">
          <span className="size-2 rounded-full bg-green-400" />
          localStorage endpoints
        </div>
      </header>
      <Outlet />
    </div>
  );
}

const rootRoute = createRootRoute({ component: RootLayout });

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: DashboardPage,
});

const bucketRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/buckets/$bucketId",
  component: BucketPage,
});

const routeTree = rootRoute.addChildren([indexRoute, bucketRoute]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
