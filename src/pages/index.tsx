import { useRouter } from "next/router";
import { useEffect } from "react";

export default function Index() {
  const router = useRouter();

  useEffect(() => {
    if (!router.isReady) return;
    void router.replace("/drive/my-drive");
  }, [router.isReady, router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-bgc">
      <p className="text-textC">Loading...</p>
    </main>
  );
}
