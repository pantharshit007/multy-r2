import { createRootRoute, createRoute, createRouter, Link, Outlet } from "@tanstack/react-router";
import { EndpointPage } from "./routes/EndpointPage";
import { DashboardPage } from "./routes/DashboardPage";
import { SetupGuidePage } from "./routes/SetupGuidePage";
import { HelpIcon } from "./components/Icons";

import { useEffect, useState } from "react";

function RootLayout() {
  const [theme, setTheme] = useState<"light" | "dark">(() => {
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
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-900 pb-5">
        <Link to="/" className="inline-flex items-center gap-3 group" aria-label="Multy R2 home">
          <span className="grid size-10 place-items-center rounded-2xl rounded-bl-md bg-amber-300 text-sm font-black text-zinc-950 shadow-lg shadow-amber-300/15 group-hover:scale-105 group-hover:bg-amber-250 transition-all duration-300">R2</span>
          <span>
            <strong className="block text-lg font-bold tracking-tight text-zinc-50 font-display leading-5">Multy</strong>
            <small className="block text-[10px] font-bold uppercase tracking-[0.25em] text-zinc-500 mt-0.5">endpoint manager</small>
          </span>
        </Link>
        
        <div className="flex items-center gap-3.5">
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
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="size-4.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="size-4.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m0 13.5V21m8.94-8.94h-2.25M4.125 12h-2.25m15.03-7.03-1.591 1.591M4.903 17.589l-1.591 1.591m12.94 0 1.591-1.591M4.903 4.903 6.494 6.494M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
              </svg>
            )}
          </button>
        </div>
      </header>
      <Outlet />
    </div>
  );
}

const rootRoute = createRootRoute({ component: RootLayout });

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
