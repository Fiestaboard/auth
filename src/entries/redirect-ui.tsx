import { hydrateRoot } from "react-dom/client";

import { RedirectPage } from "../pages/RedirectPage";

hydrateRoot(document.getElementById("root")!, <RedirectPage />);
