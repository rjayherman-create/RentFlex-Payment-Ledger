import { ClerkProvider } from "@clerk/react";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { ensurePublicEnvLoaded, getClerkPublishableKey } from "@/lib/publicEnv";
import "./styles.css";

function Root() {
  const clerkKey = getClerkPublishableKey();
  const isProduction = (import.meta as any)?.env?.PROD;

  if (!clerkKey) {
    if (isProduction) {
      return (
        <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: "24px", background: "#f8fafc" }}>
          <section style={{ maxWidth: "560px", width: "100%", borderRadius: "16px", padding: "20px", border: "1px solid #e2e8f0", background: "#fff" }}>
            <h1 style={{ margin: "0 0 8px", fontSize: "22px", color: "#0f172a" }}>Configuration Required</h1>
            <p style={{ margin: "0", color: "#475569", lineHeight: 1.5 }}>
              Clerk is required in production but no publishable key is configured. Set NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
              or VITE_CLERK_PUBLISHABLE_KEY and redeploy.
            </p>
          </section>
        </main>
      );
    }

    console.warn("[AUTH] Clerk key missing. Running guest mode in development.");
    return <App />;
  }

  return (
    <ClerkProvider publishableKey={clerkKey}>
      <App />
    </ClerkProvider>
  );
}

void ensurePublicEnvLoaded().finally(() => {
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <Root />
    </StrictMode>
  );
});
