import { renderToString } from "react-dom/server";
import { createMemoryHistory, RouterProvider } from "@tanstack/react-router";
import { router } from "./router";
export { PUBLIC_PAGES, SITE_URL } from "./constants/seo";
export { getSeo } from "./lib/seo";

export async function render(path: string) {
  router.update({ history: createMemoryHistory({ initialEntries: [path] }) });
  await router.load();
  return renderToString(<RouterProvider router={router} />);
}
