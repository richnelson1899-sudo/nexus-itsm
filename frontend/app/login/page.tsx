
"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

const API_URL = "http://localhost:3000";

type LoginResponse = {
  access_token?: string;
  user?: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  message?: string | string[];
};

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!email.trim() || !password) {
      setError("Masukkan email dan password terlebih dahulu.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim(),
          password,
        }),
      });

      const data: LoginResponse = await response.json().catch(() => ({}));

      if (!response.ok) {
        const message = Array.isArray(data.message)
          ? data.message.join(", ")
          : data.message;

        throw new Error(
          message || "Email atau password salah. Silakan coba lagi.",
        );
      }

      if (!data.access_token || !data.user) {
        throw new Error("Respons login tidak lengkap. Silakan coba lagi.");
      }

      sessionStorage.setItem("nexus_access_token", data.access_token);
      sessionStorage.setItem("nexus_user", JSON.stringify(data.user));

      router.replace("/");
    } catch (err) {
      setError(
        err instanceof TypeError
          ? "Tidak dapat terhubung ke server. Pastikan backend berjalan."
          : err instanceof Error
            ? err.message
            : "Terjadi kesalahan saat login.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 lg:grid lg:grid-cols-2">
      {/* Left branding panel */}
      <section className="relative hidden min-h-screen overflow-hidden bg-[#101d38] p-12 text-white lg:flex lg:flex-col lg:justify-between xl:p-16">
        <div className="pointer-events-none absolute -right-40 top-20 h-[480px] w-[480px] rounded-full border-[70px] border-blue-500/10" />
        <div className="pointer-events-none absolute -bottom-48 -left-28 h-[450px] w-[450px] rounded-full border-[60px] border-blue-400/10" />

        <div className="relative z-10 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500 text-2xl font-extrabold shadow-lg shadow-blue-950/40">
            N
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-wider">NEXUS</h1>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-300">
              IT Service Management
            </p>
          </div>
        </div>

        <div className="relative z-10 max-w-xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-blue-300/20 bg-blue-400/10 px-4 py-2 text-xs font-semibold text-blue-200">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            Enterprise IT Service Platform
          </span>

          <h2 className="mt-7 text-4xl font-bold leading-tight xl:text-5xl">
            Smarter IT operations.
            <span className="mt-2 block text-blue-400">
              Better service experience.
            </span>
          </h2>

          <p className="mt-6 max-w-lg text-base leading-8 text-slate-300">
            Manage service requests, track incidents, coordinate IT support,
            and improve service delivery from one centralized workspace.
          </p>

          <div className="mt-10 grid grid-cols-2 gap-4">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/20 text-xl text-blue-300">
                ◈
              </div>
              <h3 className="mt-4 text-sm font-bold">Centralized Tickets</h3>
              <p className="mt-2 text-xs leading-5 text-slate-400">
                Track and manage IT requests in one place.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 text-xl text-emerald-300">
                ✓
              </div>
              <h3 className="mt-4 text-sm font-bold">Role-Based Access</h3>
              <p className="mt-2 text-xs leading-5 text-slate-400">
                Workspaces tailored to each team and role.
              </p>
            </div>
          </div>
        </div>

        <footer className="relative z-10 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-6 text-xs text-slate-400">
          <p>NEXUS ITSM</p>
          <p>Enterprise Service Management</p>
        </footer>
      </section>

      {/* Right login panel */}
      <section className="flex min-h-screen items-center justify-center px-5 py-10 sm:px-10 lg:px-12">
        <div className="w-full max-w-md">
          {/* Mobile branding */}
          <div className="mb-10 flex items-center gap-3 lg:hidden">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-xl font-extrabold text-white">
              N
            </div>
            <div>
              <h1 className="text-lg font-extrabold tracking-wider text-slate-900">
                NEXUS
              </h1>
              <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-500">
                IT Service Management
              </p>
            </div>
          </div>

          <div className="mb-8">
            <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-2xl text-blue-700 ring-1 ring-blue-100">
              ↗
            </div>

            <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">
              Welcome to NEXUS
            </p>

            <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
              Sign in to your account
            </h2>

            <p className="mt-3 text-sm leading-6 text-slate-500">
              Masuk untuk melanjutkan ke workspace IT Service Management.
            </p>
          </div>

          {error && (
            <div
              role="alert"
              className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
            >
              <div className="flex items-start gap-3">
                <span className="font-bold">!</span>
                <p className="break-words">{error}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Email address
              </label>

              <input
                id="email"
                name="email"
                type="email"
                autoComplete="username"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@company.com"
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              />
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between gap-3">
                <label
                  htmlFor="password"
                  className="block text-sm font-semibold text-slate-700"
                >
                  Password
                </label>
              </div>

              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter your password"
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3.5 pr-20 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1 text-xs font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-200 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  Signing in...
                </>
              ) : (
                <>
                  Sign in to workspace
                  <span aria-hidden="true">→</span>
                </>
              )}
            </button>
          </form>

          <div className="my-7 flex items-center gap-4">
            <div className="h-px flex-1 bg-slate-200" />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Secure access
            </span>
            <div className="h-px flex-1 bg-slate-200" />
          </div>

          <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
              ✓
            </div>
            <div>
              <p className="text-xs font-bold text-slate-800">
                Protected workspace
              </p>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Access to tickets and service operations is controlled by your
                account permissions.
              </p>
            </div>
          </div>

          <p className="mt-8 text-center text-xs leading-5 text-slate-400">
            By signing in, you access the NEXUS IT Service Management platform.
          </p>
        </div>
      </section>
    </main>
  );
}
