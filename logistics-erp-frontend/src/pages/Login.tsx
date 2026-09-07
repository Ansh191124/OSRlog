import { useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import osrLogo from "../assets/OSR-logo-Blue.png";

export function Login() {
  const { login, isAuthenticated } = useApp();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (isAuthenticated) return <Navigate to="/" replace />;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await login(email, password);
      navigate("/", { replace: true });
    } catch {
      setError("Invalid email or password.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
        <div className="h-1.5 bg-gradient-to-r from-brand-700 via-brand-600 to-accent-500" aria-hidden="true" />
        <div className="p-8">
          <div className="mb-6 flex flex-col items-center gap-2">
            <img src={osrLogo} alt="OSR Logistics" className="h-20 w-20 object-contain" />
            <h1 className="text-lg font-semibold text-text-primary">OSR Logistics</h1>
            <p className="text-sm text-text-secondary">Carrier &amp; fleet operations portal</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="mb-1 block text-sm font-medium text-text-primary">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm text-text-primary outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                placeholder="you@osr.test"
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-1 block text-sm font-medium text-text-primary">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm text-text-primary outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                placeholder="••••••••"
              />
            </div>

            {error && <p className="text-sm text-danger-600">{error}</p>}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-md bg-brand-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-800 disabled:opacity-60"
            >
              {isSubmitting ? "Signing in..." : "Sign in"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
