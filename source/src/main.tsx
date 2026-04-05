import { createRoot } from "react-dom/client";
import App from "./app/App.tsx";
import "./styles/index.css";
import { TenantProvider } from "./contexts/TenantContext";

createRoot(document.getElementById("root")!).render(
  <TenantProvider>
    <App />
  </TenantProvider>
);
