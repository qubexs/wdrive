import { type Session } from "next-auth";
import { SessionProvider, signOut, useSession } from "next-auth/react";
import { type AppType } from "next/app";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import "@/styles/globals.css";
import Header from "@/components/headerComponents/Header";
import SideMenu from "@/components/SideMenu";

function AuthGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [loadTimedOut, setLoadTimedOut] = useState(false);
  const [redirectStuck, setRedirectStuck] = useState(false);
  const redirectStartedAt = useRef(0);

  // Slow session fetch (cold browser cache / slow proxy / DB hiccup):
  // don't hang forever on "loading" — auto-reload once, then offer retry.
  useEffect(() => {
    if (status !== "loading") {
      setLoadTimedOut(false);
      return;
    }
    setLoadTimedOut(false);
    const t = setTimeout(() => setLoadTimedOut(true), 8000);
    // Auto-refresh if session fetch itself is stuck (e.g. cold first load).
    const auto = setTimeout(() => {
      if (typeof window !== "undefined") window.location.reload();
    }, 15000);
    return () => {
      clearTimeout(t);
      clearTimeout(auto);
    };
  }, [status]);

  // Direct client redirect to sign-in (no extra /providers round-trip,
  // which is what used to hang on a cold first load).
  // NOTE: deps intentionally exclude the `router` object identity —
  // including it cleared the fallback timers on every route change.
  const pathname = router.pathname;
  const asPath = router.asPath;
  const basePath = router.basePath;
  useEffect(() => {
    if (status !== "unauthenticated") {
      setRedirectStuck(false);
      return;
    }
    // Already on sign-in (also catches a stale /wdrive/wdrive/... URL) — stop.
    if (pathname.startsWith("/auth/")) return;
    if (
      typeof window !== "undefined" &&
      window.location.pathname.includes("/auth/signin")
    )
      return;
    // Avoid stacking duplicate attempts if the effect re-runs.
    if (Date.now() - redirectStartedAt.current < 2000) return;
    redirectStartedAt.current = Date.now();
    const callbackUrl =
      typeof window !== "undefined" ? window.location.href : `${basePath}${asPath}`;
    // NOTE: router.replace/push auto-prepend basePath, so dest must NOT
    // include it (else /wdrive/wdrive/auth/signin loop). Hard navigation
    // via window.location needs the full path, so keep both variants.
    const dest = `/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`;
    const hardDest = `${basePath}/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`;
    void router.replace(dest).catch(() => {
      if (typeof window !== "undefined") window.location.href = hardDest;
    });
    // Show manual fallback, then hard-navigate, then auto-refresh.
    const stuckTimer = setTimeout(() => setRedirectStuck(true), 4000);
    const hardTimer = setTimeout(() => {
      if (
        typeof window !== "undefined" &&
        !window.location.pathname.includes("/auth/signin")
      ) {
        window.location.href = hardDest;
      }
    }, 6000);
    const reloadTimer = setTimeout(() => {
      if (
        typeof window !== "undefined" &&
        !window.location.pathname.includes("/auth/signin")
      ) {
        window.location.reload();
      }
    }, 12000);
    return () => {
      clearTimeout(stuckTimer);
      clearTimeout(hardTimer);
      clearTimeout(reloadTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, pathname, asPath, basePath]);

  // Force logout the moment the 24h session expires, even with the tab open.
  // NextAuth gives session.expires = login time + 24h (see SESSION_MAX_AGE_SECONDS).
  // Also handles the server-side absolute-expiry flag (session.error).
  useEffect(() => {
    if (status !== "authenticated") return;
    if ((session as any)?.error === "SessionExpired") {
      void signOut({ callbackUrl: "/wdrive/auth/signin?reason=expired" });
      return;
    }
    const expiresAt = session?.expires ? new Date(session.expires).getTime() : NaN;
    if (Number.isNaN(expiresAt)) return;
    const msLeft = expiresAt - Date.now();
    if (msLeft <= 0) {
      void signOut({ callbackUrl: "/wdrive/auth/signin?reason=expired" });
      return;
    }
    const t = setTimeout(() => {
      void signOut({ callbackUrl: "/wdrive/auth/signin?reason=expired" });
    }, msLeft + 1000);
    return () => clearTimeout(t);
  }, [status, session?.expires, (session as any)?.error]);

  if (status === "loading") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-bgc">
        <div className="flex flex-col items-center gap-3">
          <p className="text-textC">Loading session...</p>
          {loadTimedOut && (
            <>
              <p className="text-sm text-textC/70">
                Taking longer than usual (cold cache or slow network).
              </p>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="rounded-full bg-white/10 px-5 py-2 text-sm text-textC hover:bg-white/20"
              >
                Retry
              </button>
            </>
          )}
        </div>
      </main>
    );
  }

  if (status !== "authenticated") {
    const callbackUrl =
      typeof window !== "undefined"
        ? window.location.href
        : `${router.basePath}${router.asPath}`;
    // router-less fallback button uses a full path (window.location),
    // so it needs the basePath prefix; router.replace above must not.
    const dest = `${router.basePath}/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`;
    return (
      <main className="flex min-h-screen items-center justify-center bg-bgc">
        <div className="flex flex-col items-center gap-3">
          <p className="text-textC">Redirecting to login...</p>
          {redirectStuck && (
            <button
              type="button"
              onClick={() => {
                window.location.href = dest;
              }}
              className="rounded-full bg-white/10 px-5 py-2 text-sm text-textC hover:bg-white/20"
            >
              Continue to login
            </button>
          )}
        </div>
      </main>
    );
  }

  return <>{children}</>;
}

const MyApp: AppType<{ session: Session | null }> = ({
  Component,
  pageProps: { session, ...pageProps },
}) => {
  const router = useRouter();

  // Global safety net: never let a dropped FILE navigate the browser
  // (open in new tab). Only file drags are blocked so text drops into
  // inputs keep working.
  useEffect(() => {
    const guard = (e: DragEvent) => {
      if (e.dataTransfer?.types?.includes("Files")) e.preventDefault();
    };
    // disable right-click menu, except inside editable fields (keep paste)
    const noMenu = (e: MouseEvent) => {
      const t = e.target as HTMLElement | null;
      if (t?.closest?.("input, textarea, select, [contenteditable]")) return;
      e.preventDefault();
    };
    document.addEventListener("dragover", guard);
    document.addEventListener("drop", guard);
    document.addEventListener("contextmenu", noMenu);
    return () => {
      document.removeEventListener("dragover", guard);
      document.removeEventListener("drop", guard);
      document.removeEventListener("contextmenu", noMenu);
    };
  }, []);

  // Public routes (share + auth + legal/help)
  const isPublic =
    router.pathname.startsWith("/share/") ||
    router.pathname.startsWith("/auth/") ||
    router.pathname === "/privacy" ||
    router.pathname === "/terms" ||
    router.pathname === "/help";
  const isAdminRoute = router.pathname.startsWith("/admin");
  // user profile page has its own drive-style shell (like admin)
  const isProfileRoute = router.pathname === "/[userid]";

  if (isAdminRoute || isProfileRoute) {
    return (
      <SessionProvider session={session} basePath="/wdrive/api/auth" refetchInterval={5 * 60} refetchOnWindowFocus={false}>
        <Head>
          <title>My Drive - WDrive Intranet</title>
          <link rel="icon" href="/wdrive/favicon.ico" sizes="any" />
          <link rel="icon" type="image/png" sizes="32x32" href="/wdrive/favicon-32x32.png" />
          <link rel="icon" type="image/png" sizes="16x16" href="/wdrive/favicon-16x16.png" />
          <link rel="apple-touch-icon" href="/wdrive/apple-touch-icon.png" />
          <link rel="manifest" href="/wdrive/site.webmanifest" />
          <meta name="theme-color" content="#ffffff" />
        </Head>
        <AuthGate>
          <Component {...pageProps} />
        </AuthGate>
      </SessionProvider>
    );
  }

  // Public layout - no AuthGate, centered
  if (isPublic) {
    return (
      <SessionProvider session={session} basePath="/wdrive/api/auth" refetchInterval={5 * 60} refetchOnWindowFocus={false}>
        <Head>
          <title>My Drive - WDrive Intranet</title>
          <link rel="icon" href="/wdrive/favicon.ico" sizes="any" />
          <link rel="icon" type="image/png" sizes="32x32" href="/wdrive/favicon-32x32.png" />
          <link rel="icon" type="image/png" sizes="16x16" href="/wdrive/favicon-16x16.png" />
          <link rel="apple-touch-icon" href="/wdrive/apple-touch-icon.png" />
          <link rel="manifest" href="/wdrive/site.webmanifest" />
          <meta name="theme-color" content="#ffffff" />
        </Head>
        <Component {...pageProps} />
      </SessionProvider>
    );
  }

  // Protected app
  return (
    <SessionProvider session={session} basePath="/wdrive/api/auth" refetchInterval={5 * 60} refetchOnWindowFocus={false}>
      <Head>
        <title>My Drive - WDrive Intranet</title>
        <link rel="icon" href="/wdrive/favicon.ico" sizes="any" />
        <link rel="icon" type="image/png" sizes="32x32" href="/wdrive/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/wdrive/favicon-16x16.png" />
        <link rel="apple-touch-icon" href="/wdrive/apple-touch-icon.png" />
        <link rel="manifest" href="/wdrive/site.webmanifest" />
        <meta name="theme-color" content="#ffffff" />
      </Head>
      <AuthGate>
        <main className="flex h-screen flex-col overflow-hidden bg-bgc">
          <Header />

          <section className="mb-5 flex flex-1 overflow-hidden px-5 pr-16">
            <div>
              <SideMenu />
            </div>

            <div className="flex flex-1">
              <div className="h-[90vh] w-full overflow-hidden rounded-2xl bg-white">
                <Component {...pageProps} />
              </div>
            </div>
          </section>
        </main>
      </AuthGate>
    </SessionProvider>
  );
};

export default MyApp;
