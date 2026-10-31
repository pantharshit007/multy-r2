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
    <div className="min-h-screen text-fg">
      <header className="sticky top-0 z-40 border-b border-line bg-canvas/85 backdrop-blur-xl">
        <div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link to="/" className="inline-flex items-center gap-2.5" aria-label="Multy R2 home">
            <span className="grid size-8 place-items-center rounded-lg rounded-bl-sm bg-accent text-xs font-bold text-accent-fg">R2</span>
            <span className="text-[15px] font-semibold tracking-tight text-fg">Multy</span>
            <span className="hidden text-sm text-subtle sm:inline">Endpoint manager</span>
          </Link>

          <nav aria-label="Main navigation" className="flex items-center gap-1">
            <a href={GITHUB_REPO_URL} target="_blank" rel="noopener noreferrer" aria-label="Multy R2 on GitHub (opens in a new tab)" className="btn btn-ghost h-8 px-2.5">
              <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="size-4"><path d="M12 .75a11.25 11.25 0 0 0-3.56 21.92c.56.1.77-.24.77-.54v-2.1c-3.13.68-3.79-1.33-3.79-1.33-.51-1.3-1.25-1.65-1.25-1.65-1.02-.7.08-.68.08-.68 1.13.08 1.72 1.16 1.72 1.16 1 1.72 2.63 1.22 3.27.93.1-.73.39-1.22.71-1.5-2.5-.29-5.13-1.25-5.13-5.56 0-1.23.44-2.23 1.16-3.02-.12-.28-.5-1.43.11-2.98 0 0 .95-.3 3.1 1.15A10.8 10.8 0 0 1 12 6.17c.96 0 1.92.13 2.82.38 2.15-1.46 3.1-1.15 3.1-1.15.61 1.55.23 2.7.11 2.98.72.79 1.16 1.79 1.16 3.02 0 4.32-2.64 5.27-5.15 5.55.4.35.76 1.03.76 2.08v3.1c0 .3.2.65.78.54A11.25 11.25 0 0 0 12 .75Z" /></svg>
              <span className="hidden sm:inline">GitHub</span>
            </a>
            <Link to="/setup-guide" className="btn btn-ghost h-8 px-2.5" activeProps={{ className: "bg-raised text-fg" }}>
              <HelpIcon className="size-4" />
              <span className="hidden sm:inline">Setup guide</span>
            </Link>
            <span aria-hidden="true" className="mx-1 h-5 w-px bg-line" />
            <button
              onClick={() => setTheme(theme === "light" ? "dark" : "light")}
              className="icon-btn"
              title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
              aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
              type="button"
            >
              {theme === "light" ? <MoonIcon className="size-4" /> : <SunIcon className="size-4" />}
            </button>
          </nav>
        </div>
      </header>
      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
        <Outlet />
      </div>
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
