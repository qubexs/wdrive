import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/router";

const UPDATED = "14 September 2026";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-6">
      <h2 className="text-[18px] font-medium text-white">{title}</h2>
      <div className="mt-2 space-y-2 text-[14px] leading-6 text-[#e8eaed]">{children}</div>
    </section>
  );
}

export default function Terms() {
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
                Terms of Service — WDrive Intranet
              </h1>
              <p className="text-[14px] text-[#9aa0a6]">Last updated: {UPDATED}</p>
            </div>
          </div>

          <p className="mt-6 text-[14px] leading-6 text-[#e8eaed]">
            These terms govern use of <strong>WDrive</strong>, an internal intranet file manager for
            authorised staff. By registering for or using an account you agree to these terms and to
            the <Link href="/privacy" className="text-[#8ab4f8] hover:underline">Privacy Policy</Link>.
            If you do not agree, do not use the system.
          </p>

          <Section title="1. Who may use WDrive">
            <ul className="list-disc pl-5 space-y-1">
              <li>Authorised personnel only. Registration requires a valid work email on an approved domain and <strong>admin approval</strong> before sign-in.</li>
              <li>You must keep your password confidential, use a work-appropriate credential, and sign out on shared computers (consider Guest mode).</li>
              <li>Administrators may approve, suspend, disable or remove accounts, and adjust roles, permissions and storage limits at any time.</li>
            </ul>
          </Section>

          <Section title="2. Acceptable use">
            <ul className="list-disc pl-5 space-y-1">
              <li>Use WDrive only for legitimate work purposes and lawful content. You must have the right to store and share anything you upload.</li>
              <li>Prohibited: unlawful, confidential-without-authority, or malicious content; attempting to bypass permissions, quotas or access controls; sharing credentials; bulk-harvesting other users&rsquo; data.</li>
              <li>Respect per-user permissions (<code>canUpload / canDownload / canShare / canDelete</code>, etc.). API or UI errors such as 403/413 are enforcement, not bugs to circumvent.</li>
            </ul>
          </Section>

          <Section title="3. Storage, quotas & sharing">
            <ul className="list-disc pl-5 space-y-1">
              <li>Default quota is <strong>200&nbsp;MB per user</strong> unless an administrator sets another limit; uploads over quota are rejected.</li>
              <li>Only <strong>files</strong> (not folders) can be shared by public link. Setting a file to &ldquo;Anyone with the link&rdquo; makes it accessible to anyone holding the URL without login — you are responsible for links you create. Set it back to &ldquo;Only you&rdquo; to revoke.</li>
              <li>Local-disk uploads are served via public URLs so share links work; do not upload material that must never be link-accessible.</li>
              <li>Trashed items can be restored; &ldquo;delete forever&rdquo; and admin removal are irreversible. Maintain your own backups of critical work.</li>
            </ul>
          </Section>

          <Section title="4. Administration, monitoring & availability">
            <ul className="list-disc pl-5 space-y-1">
              <li>The system is administered internally: usage, approvals, quotas and security events may be logged and reviewed to protect the intranet.</li>
              <li>WDrive is provided &ldquo;as is&rdquo; for internal use without uptime guarantees. Maintenance, upgrades or incidents may cause temporary unavailability; local-disk uploads do not persist on ephemeral hosting (e.g. Vercel) — production deployments should use configured cloud storage.</li>
            </ul>
          </Section>

          <Section title="5. Termination & governing law">
            <p>Access ends when your authorisation ends (e.g. employment/contract ends) or when an administrator disables your account; your files may then be transferred or deleted per organisation procedure. These terms are governed by the laws of <strong>Malaysia</strong>. Breaches may additionally be handled under your organisation&rsquo;s disciplinary or contractual procedures.</p>
          </Section>

          <Section title="6. Contact">
            <p>For account help, approvals, quota changes or abuse reports, contact your intranet administrator.</p>
          </Section>

          <div className="mt-8 flex items-center justify-between border-t border-[#3c4043]/50 pt-4 text-sm">
            <Link href="/auth/signin" className="text-[#8ab4f8] hover:underline">Back to Sign in</Link>
            <Link href="/privacy" className="text-[#8ab4f8] hover:underline">Privacy Policy</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
