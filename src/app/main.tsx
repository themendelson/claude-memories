import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "#app/App.tsx";
import "#app/styles/theme.css";
import "#app/styles/layout.css";
import "#app/styles/components.css";
import "#app/styles/prose.css";
import "#app/styles/dialog.css";
import "#app/styles/mobile.css";

const root = document.getElementById("root");
if (root === null) throw new Error("index.html has no #root element");

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
