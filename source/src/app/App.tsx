import { RouterProvider } from "react-router";
import { router } from "./routes.tsx";
import { useEffect } from "react";
import { registerServiceWorker } from "./lib/offlineQueue";

// CRITICAL: Import emergency fix FIRST to repair any corrupted data
import "./lib/emergencyDataFix";

export default function App() {
  // Register service worker for offline-first support
  useEffect(() => {
    registerServiceWorker();
  }, []);

  return <RouterProvider router={router} />;
}