import { ClerkProvider } from "@clerk/react";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { ensurePublicEnvLoaded, getClerkPublishableKey } from "@/lib/publicEnv";
import "./styles.css";

function Root() {
  const clerkKey = getClerkPublishableKey();

  if (!clerkKey) {
    console.warn("[AUTH] Clerk key missing. Running guest mode.");
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
