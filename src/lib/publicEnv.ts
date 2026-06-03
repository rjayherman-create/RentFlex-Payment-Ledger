export type PublicRuntimeEnv = {
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?: string;
  VITE_CLERK_PUBLISHABLE_KEY?: string;
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?: string;
  APP_NAME?: string;
};

declare global {
  interface Window {
    __PUBLIC_ENV__?: PublicRuntimeEnv;
  }
}

export function getPublicEnv(name: keyof PublicRuntimeEnv): string | undefined {
  return window.__PUBLIC_ENV__?.[name] || (import.meta as any)?.env?.[name];
}

export function getClerkPublishableKey() {
  return getPublicEnv("VITE_CLERK_PUBLISHABLE_KEY") || getPublicEnv("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY");
}

export function ensurePublicEnvLoaded() {
  if (typeof window === "undefined") {
    return Promise.resolve();
  }

  if (window.__PUBLIC_ENV__) {
    return Promise.resolve();
  }

  return new Promise<void>((resolve) => {
    const script = document.createElement("script");
    script.src = "/env.js";
    script.async = false;
    script.onload = () => resolve();
    script.onerror = () => resolve();
    document.head.appendChild(script);
  });
}