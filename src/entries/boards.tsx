import { hydrateRoot } from "react-dom/client";

import { BoardsPage } from "../pages/BoardsPage";

hydrateRoot(document.getElementById("root")!, <BoardsPage />);
