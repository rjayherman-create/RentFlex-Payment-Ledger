import { useEffect, useState } from "react";

type AuthTab = "sign_in" | "create_account";

export function AuthControls() {
  const [isOpen, setIsOpen] = useState(false);
  const [tab, setTab] = useState<AuthTab>("sign_in");

  useEffect(() => {
    if (!isOpen) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setIsOpen(false);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen]);

  return (
    <>
      <button className="get-started-button" type="button" onClick={() => setIsOpen(true)}>
        Get Started
      </button>

      {isOpen ? (
        <div className="auth-modal-backdrop" onClick={() => setIsOpen(false)}>
          <section
            className="auth-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="auth-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <button className="auth-modal-close" type="button" aria-label="Close" onClick={() => setIsOpen(false)}>
              x
            </button>

            <header className="auth-modal-header">
              <h2 id="auth-modal-title">Welcome to RentFlex Ledger</h2>
              <p>Manage flexible rent payment plans with ease.</p>
            </header>

            <div className="auth-tabs" role="tablist" aria-label="Authentication options">
              <button
                className={tab === "sign_in" ? "auth-tab active" : "auth-tab"}
                type="button"
                role="tab"
                aria-selected={tab === "sign_in"}
                onClick={() => setTab("sign_in")}
              >
                Sign In
              </button>
              <button
                className={tab === "create_account" ? "auth-tab active" : "auth-tab"}
                type="button"
                role="tab"
                aria-selected={tab === "create_account"}
                onClick={() => setTab("create_account")}
              >
                Create Account
              </button>
            </div>

            {tab === "sign_in" ? (
              <form className="auth-form" onSubmit={(event) => event.preventDefault()}>
                <label>
                  <span>Email Address</span>
                  <input type="email" required autoComplete="email" />
                </label>
                <label>
                  <span>Password</span>
                  <input type="password" required autoComplete="current-password" />
                </label>
                <button className="primary-button auth-submit" type="submit">Sign In</button>
                <button className="auth-link" type="button">Forgot Password?</button>
              </form>
            ) : (
              <form className="auth-form" onSubmit={(event) => event.preventDefault()}>
                <label>
                  <span>First Name</span>
                  <input type="text" required autoComplete="given-name" />
                </label>
                <label>
                  <span>Last Name</span>
                  <input type="text" required autoComplete="family-name" />
                </label>
                <label>
                  <span>Email Address</span>
                  <input type="email" required autoComplete="email" />
                </label>
                <label>
                  <span>Password</span>
                  <input type="password" required autoComplete="new-password" />
                </label>
                <label>
                  <span>Confirm Password</span>
                  <input type="password" required autoComplete="new-password" />
                </label>
                <button className="primary-button auth-submit" type="submit">Create Account</button>
              </form>
            )}

            <footer className="auth-modal-footer">
              By continuing you agree to the Terms of Service and Privacy Policy.
            </footer>
          </section>
        </div>
      ) : null}
    </>
  );
}