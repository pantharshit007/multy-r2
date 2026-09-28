import { createRootRoute, createRoute, createRouter, Link, Outlet, useLocation } from "@tanstack/react-router";
import { EndpointPage } from "./routes/EndpointPage";
import { DashboardPage } from "./routes/DashboardPage";
import { NotFoundPage } from "./routes/NotFoundPage";
import { SetupGuidePage } from "./routes/SetupGuidePage";
import { HelpIcon, MoonIcon, SunIcon } from "./components/Icons";

import { GITHUB_REPO_URL } from "./constants";
import { applySeo } from "./lib/seo";

import { useEffect, useState } from "react";

function RootLayout() {
  const pathname = useLocation({ select: (location) => location.pathname });
  useEffect(() => { applySeo(pathname); }, [pathname]);
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof window === "undefined") return "dark";
    const stored = localStorage.getItem("multy-r2:theme");
    if (stored === "light" || stored === "dark") return stored;
    return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "light") {
      root.classList.add("light");
      root.style.colorScheme = "light";
    } else {
      root.classList.remove("light");
      root.style.colorScheme = "dark";
    }
    localStorage.setItem("multy-r2:theme", theme);
  }, [theme]);

  return (
    <div className="mx-auto min-h-screen w-full max-w-7xl px-4 py-6 text-zinc-100 sm:px-6">
      <header className="sticky top-3 z-40 mb-6 rounded-2xl border border-zinc-800/80 bg-zinc-950/70 px-5 py-3.5 shadow-xl shadow-zinc-950/40 backdrop-blur-xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Link to="/" className="inline-flex items-center gap-3 group" aria-label="Multy R2 home">
          <span className="grid size-10 place-items-center rounded-2xl rounded-bl-md bg-amber-300 text-sm font-black text-zinc-950 shadow-lg shadow-amber-300/15 group-hover:scale-105 group-hover:bg-amber-250 transition-all duration-300">R2</span>
          <span>
            <strong className="block text-lg font-bold tracking-tight text-zinc-50 font-display leading-5">Multy</strong>
            <small className="block text-[10px] font-bold uppercase tracking-[0.25em] text-zinc-500 mt-0.5">endpoint manager</small>
          </span>
        </Link>
        
        <nav aria-label="Main navigation" className="flex flex-wrap items-center gap-3.5">
          <a href={GITHUB_REPO_URL} target="_blank" rel="noopener noreferrer" aria-label="Multy R2 on GitHub (opens in a new tab)" className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-400 hover:text-amber-200">
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="size-5"><path d="M12 .75a11.25 11.25 0 0 0-3.56 21.92c.56.1.77-.24.77-.54v-2.1c-3.13.68-3.79-1.33-3.79-1.33-.51-1.3-1.25-1.65-1.25-1.65-1.02-.7.08-.68.08-.68 1.13.08 1.72 1.16 1.72 1.16 1 1.72 2.63 1.22 3.27.93.1-.73.39-1.22.71-1.5-2.5-.29-5.13-1.25-5.13-5.56 0-1.23.44-2.23 1.16-3.02-.12-.28-.5-1.43.11-2.98 0 0 .95-.3 3.1 1.15A10.8 10.8 0 0 1 12 6.17c.96 0 1.92.13 2.82.38 2.15-1.46 3.1-1.15 3.1-1.15.61 1.55.23 2.7.11 2.98.72.79 1.16 1.79 1.16 3.02 0 4.32-2.64 5.27-5.15 5.55.4.35.76 1.03.76 2.08v3.1c0 .3.2.65.78.54A11.25 11.25 0 0 0 12 .75Z" /></svg>
            GitHub
          </a>
          <Link
            to="/setup-guide"
            className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-900/10 px-3 h-8 text-xs font-semibold text-zinc-400 hover:text-amber-200 hover:border-amber-300/40 transition-colors"
          >
            <HelpIcon className="size-3.5" />
            Setup guide
          </Link>
          <button
            onClick={() => setTheme(theme === "light" ? "dark" : "light")}
            className="flex size-8 cursor-pointer items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900/10 text-zinc-400 hover:text-zinc-100 hover:border-zinc-700 transition-colors"
            title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
            type="button"
          >
            {theme === "light" ? (
              <MoonIcon className="size-4.5" />
            ) : (
              <SunIcon className="size-4.5" />
            )}
          </button>
        </nav>
        </div>
      </header>
      <Outlet />
    </div>
  );
}

const rootRoute = createRootRoute({ component: RootLayout, notFoundComponent: NotFoundPage });

const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: DashboardPage,
});

const endpointRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/buckets/$bucketId",
  component: EndpointPage,
});

const setupGuideRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/setup-guide",
  component: SetupGuidePage,
});

const routeTree = rootRoute.addChildren([dashboardRoute, endpointRoute, setupGuideRoute]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
