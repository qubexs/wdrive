import { type Session } from "next-auth";
import { SessionProvider, signIn, useSession } from "next-auth/react";
import { type AppType } from "next/app";
import { type ReactNode, useEffect } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import "@/styles/globals.css";
import Header from "@/components/headerComponents/Header";
import SideMenu from "@/components/SideMenu";

function AuthGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { status } = useSession({
    required: true,
    onUnauthenticated() {
      const callbackUrl =
        typeof window !== "undefined" ? window.location.href : `http://10.44.145.220/wdrive${router.asPath}`;
      void signIn(undefined, {
        callbackUrl,
      });
    },
  });

  if (status !== "authenticated") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-bgc">
        <p className="text-textC">Redirecting to login...</p>
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
      <SessionProvider session={session} basePath="/wdrive/api/auth">
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
      <SessionProvider session={session} basePath="/wdrive/api/auth">
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
    <SessionProvider session={session} basePath="/wdrive/api/auth">
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
