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

export default function Privacy() {
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
                Privacy Policy — WDrive Intranet
              </h1>
              <p className="text-[14px] text-[#9aa0a6]">Last updated: {UPDATED}</p>
            </div>
          </div>

          <p className="mt-6 text-[14px] leading-6 text-[#e8eaed]">
            WDrive (&ldquo;we&rdquo;, &ldquo;the system&rdquo;) is an <strong>internal intranet file
            manager</strong> for authorised staff only. It is self-hosted and not a public service.
            This policy explains what personal data we collect, why, and your rights under
            Malaysia&rsquo;s <strong>Personal Data Protection Act 2010 (PDPA)</strong>.
            This is an operational notice, not legal advice — please ask your administrator or
            legal/HR team if anything is unclear.
          </p>

          <Section title="1. Data we collect">
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Account data (from registration):</strong> full name, work email, hashed password, IC number, department, profile / job title, profile photo (if set via Google or upload).</li>
              <li><strong>Approval &amp; admin data:</strong> approval status, active status, role (ADMIN/USER), per-user permissions (upload, download, share, etc.), storage quota, allowed email domains.</li>
              <li><strong>Your files &amp; metadata:</strong> files and folders you upload, file names, sizes, folder structure, star/trash state, share settings and share tokens.</li>
              <li><strong>Auth &amp; technical data:</strong> login sessions (NextAuth JWT/session), timestamps, basic server logs (e.g. failed logins, quota rejections). No advertising trackers or analytics beacons are used.</li>
            </ul>
            <p>Your IC number is treated as <strong>sensitive personal data</strong>: it is collected only to verify staff identity and is visible only to you and authorised administrators.</p>
          </Section>

          <Section title="2. Why we use it (purpose)">
            <ul className="list-disc pl-5 space-y-1">
              <li>Create and administer your account, including admin approval and email-domain checks.</li>
              <li>Provide storage, search, preview, sharing, quota enforcement and account recovery.</li>
              <li>Keep the intranet secure: prevent abuse, enforce permissions, investigate incidents.</li>
              <li>Meet record-keeping and employment-related obligations of the organisation.</li>
            </ul>
            <p>We process data on the basis of your consent at registration, your employment/service relationship, and our legitimate need to run a secure internal system. We do <strong>not</strong> sell personal data or use it for marketing.</p>
          </Section>

          <Section title="3. Who can see your data">
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Administrators</strong> (including addresses in <code>ADMIN_EMAILS</code> and <code>demo@local.dev</code> where present) can view and manage user accounts, approvals, permissions and aggregate storage — but not your passwords, which are stored hashed with bcrypt.</li>
              <li><strong>IT/hosting operators</strong> maintaining the server, database (PostgreSQL) and local upload volumes.</li>
              <li><strong>Optional processors, only if enabled:</strong> Google (OAuth login) and Cloudinary (cloud file storage). If these are not configured, login uses email + password and uploads stay on local disk. See their own privacy notices if used.</li>
              <li><strong>Anyone with a share link:</strong> files you set to &ldquo;Anyone with the link&rdquo; are public to link holders without login. Local serve URLs are also intentionally public so share links work — do not store files there that must stay strictly private.</li>
            </ul>
            <p>We do not disclose data to other third parties except where required by Malaysian law.</p>
          </Section>

          <Section title="4. Storage, security & retention">
            <ul className="list-disc pl-5 space-y-1">
              <li>Data is stored on organisation-controlled infrastructure (PostgreSQL + server / Cloudinary if enabled). Default quota is 200&nbsp;MB per user unless an admin sets another limit.</li>
              <li>Passwords are hashed (bcrypt); sessions expire automatically; admins can disable accounts and revoke access immediately.</li>
              <li>We keep account and file data while your account is active. When you leave or your account is removed, your files and profile are deleted or transferred per organisation procedure; backups rotate out thereafter. Ask your administrator for the exact retention schedule.</li>
            </ul>
          </Section>

          <Section title="5. Your rights (PDPA ss. 7–12)">
            <p>You may request to access, correct, limit, or withdraw consent for processing of your personal data, subject to employment, legal and security requirements. To exercise these rights — including correcting your name, department or IC number — contact your intranet administrator (or HR/DPO). You can also update your profile and change your password in-app at any time.</p>
            <p>Withdrawing consent for essential account data means we can no longer provide you with a WDrive account and it will be deactivated.</p>
          </Section>

          <Section title="6. Cookies & sessions">
            <p>We use strictly necessary session cookies/tokens (NextAuth) to keep you signed in and to remember view preferences (list/grid). No third-party advertising or cross-site tracking cookies are set by WDrive itself.</p>
          </Section>

          <Section title="7. Changes & contact">
            <p>We may update this policy as the system or PDPA guidance changes; the date above will be revised and material changes announced on the intranet. For questions or PDPA requests, contact your intranet administrator. If your organisation has a Data Protection Officer, their contact details should be published on the intranet alongside this page.</p>
          </Section>

          <div className="mt-8 flex items-center justify-between border-t border-[#3c4043]/50 pt-4 text-sm">
            <Link href="/auth/signin" className="text-[#8ab4f8] hover:underline">Back to Sign in</Link>
            <Link href="/terms" className="text-[#8ab4f8] hover:underline">Terms of Service</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
