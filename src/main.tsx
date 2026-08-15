import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { UpdatePrompt } from "./pwa/UpdatePrompt";
import "./styles/app.css";

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Root element #root not found");
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
    <UpdatePrompt />
  </StrictMode>,
);
