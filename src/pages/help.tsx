import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/router";

function Section({ id, title, children }: { id?: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="mt-6 scroll-mt-6">
      <h2 className="text-[18px] font-medium text-white">{title}</h2>
      <div className="mt-2 space-y-2 text-[14px] leading-6 text-[#e8eaed]">{children}</div>
    </section>
  );
}

export default function Help() {
  const router = useRouter();
  return (
    <div
      className="min-h-screen bg-[#202124] flex flex-col"
      style={{ fontFamily: '"Google Sans", Roboto, Arial, sans-serif' }}
    >
      <div className="flex flex-1 justify-center p-4">
        <div className="w-full max-w-[840px] bg-[#0e0e0e] rounded-[28px] border border-[#3c4043]/30 shadow-[0_1px_3px_rgba(0,0,0,0.5)] px-6 py-8 md:px-10">
          <div className="flex items-center gap-4">
            <Image
              src={`${router.basePath}/wpre.png`}
              alt="logo"
              width={40}
              height={40}
              className="h-10 w-10 object-contain"
              priority
            />
            <div>
              <h1 className="text-[28px] leading-9 font-normal text-white tracking-tight">
                Help — WDrive Intranet
              </h1>
              <p className="text-[14px] text-[#9aa0a6]">Signing in, accounts &amp; private browsing</p>
            </div>
          </div>

          <Section id="sign-in" title="Signing in">
            <ul className="list-disc pl-5 space-y-1">
              <li>Go to <strong>Sign in</strong>, enter your work email, then your password.</li>
              <li>No account yet? Use <strong>Create account</strong> to register — an administrator must approve it before you can sign in.</li>
              <li>See an error? <strong>“Account pending admin approval”</strong> means wait for approval; <strong>“Account disabled”</strong> or <strong>“Email domain is not allowed”</strong> means contact your administrator.</li>
            </ul>
          </Section>

          <Section id="forgot-email" title="Forgot email or password?">
            <p>
              Your sign-in email is your work email address. If you forgot which one you registered
              with, check with your administrator — they can look it up in the admin dashboard.
              If you forgot your password, sign in is not possible without it: ask your
              administrator to reset it, or use <strong>Change password</strong> in the account menu
              once you are signed in.
            </p>
          </Section>

          <Section id="guest-mode" title="Not your computer? Browse privately">
            <p>
              On a shared or public computer, use your browser&rsquo;s private mode so your session
              is not left behind: in Chrome use <strong>Guest mode</strong> or a
              <strong> new Incognito window</strong> (Ctrl+Shift+N / Cmd+Shift+N); in Edge use
              InPrivate, in Firefox use a Private Window.
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Private windows don&rsquo;t save history or cookies after you close them.</li>
              <li>Still choose <strong>Sign out</strong> in WDrive and close the private window when done.</li>
              <li>Never tick “remember me” / save-password on a shared computer.</li>
            </ul>
          </Section>

          <Section id="contact" title="Still stuck?">
            <p>Contact your intranet administrator with your name, work email, and the exact error message. For privacy requests, see the <Link href="/privacy" className="text-[#8ab4f8] hover:underline">Privacy Policy</Link>.</p>
          </Section>

          <div className="mt-8 flex items-center justify-between border-t border-[#3c4043]/50 pt-4 text-sm">
            <Link href="/auth/signin" className="text-[#8ab4f8] hover:underline">Back to Sign in</Link>
            <div className="flex gap-4">
              <Link href="/privacy" className="text-[#8ab4f8] hover:underline">Privacy</Link>
              <Link href="/terms" className="text-[#8ab4f8] hover:underline">Terms</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
