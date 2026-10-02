// Build-time only: renders each page to the HTML that scripts/prerender.mjs
// writes into dist/. Keys are paths inside dist/.
import type { ReactElement } from "react";
import { renderToString } from "react-dom/server";

import { BoardsPage } from "./pages/BoardsPage";
import { HomePage } from "./pages/HomePage";
import { RedirectPage } from "./pages/RedirectPage";

const PAGES: Record<string, ReactElement> = {
  "index.html": <HomePage />,
  "oauth/redirect.html": <RedirectPage />,
  "oauth/boards.html": <BoardsPage />,
};

export function renderPages(): Record<string, string> {
  return Object.fromEntries(Object.entries(PAGES).map(([path, page]) => [path, renderToString(page)]));
}
