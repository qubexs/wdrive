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
              <p className="text-[14px] text-[#9aa0a6]">Signing in, using Drive, sharing &amp; troubleshooting</p>
            </div>
          </div>

          <nav className="mt-6 rounded-2xl border border-[#3c4043]/50 bg-[#1e1f20] px-5 py-4 text-[13px] leading-6 text-[#e8eaed]">
            <p className="font-medium text-white">On this page</p>
            <ul className="mt-1 grid gap-1 sm:grid-cols-2">
              <li><a href="#sign-in" className="text-[#8ab4f8] hover:underline">Signing in</a></li>
              <li><a href="#forgot-email" className="text-[#8ab4f8] hover:underline">Forgot email or password?</a></li>
              <li><a href="#guest-mode" className="text-[#8ab4f8] hover:underline">Not your computer? Browse privately</a></li>
              <li><a href="#tour" className="text-[#8ab4f8] hover:underline">Finding your way around</a></li>
              <li><a href="#upload" className="text-[#8ab4f8] hover:underline">Uploading files &amp; folders</a></li>
              <li><a href="#organize" className="text-[#8ab4f8] hover:underline">Organizing: create, rename, move, copy, star</a></li>
              <li><a href="#search-preview" className="text-[#8ab4f8] hover:underline">Search, view &amp; preview</a></li>
              <li><a href="#quota" className="text-[#8ab4f8] hover:underline">Storage &amp; quota</a></li>
              <li><a href="#sharing" className="text-[#8ab4f8] hover:underline">Sharing files</a></li>
              <li><a href="#trash" className="text-[#8ab4f8] hover:underline">Trash, restore &amp; delete forever</a></li>
              <li><a href="#permissions" className="text-[#8ab4f8] hover:underline">Permissions &amp; your profile</a></li>
              <li><a href="#troubleshooting" className="text-[#8ab4f8] hover:underline">Troubleshooting</a></li>
              <li><a href="#contact" className="text-[#8ab4f8] hover:underline">Still stuck?</a></li>
            </ul>
          </nav>

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

          <Section id="tour" title="Finding your way around">
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>My Drive</strong> (<Link href="/drive/my-drive" className="text-[#8ab4f8] hover:underline">/drive/my-drive</Link>) — your private files and folders. Only you (and administrators) can see them unless you share a file.</li>
              <li><strong>Drive / Shared Drive</strong> (<Link href="/drive" className="text-[#8ab4f8] hover:underline">/drive</Link>) — files shared with everyone. Read-only for most users; only admins can add, rename, move or delete here.</li>
              <li><strong>Starred</strong> — your flagged files/folders for quick access. Starring never moves the item.</li>
              <li><strong>Trash</strong> — deleted items waiting for restore or permanent deletion.</li>
              <li>Use the left menu <strong>New</strong> button to create folders or upload, and the top bar to switch <strong>list / grid</strong> view.</li>
            </ul>
          </Section>

          <Section id="upload" title="Uploading files & folders">
            <ul className="list-disc pl-5 space-y-1">
              <li>Click <strong>New → File upload / Folder upload</strong>, or <strong>drag-and-drop</strong> files straight onto the Drive page. Folder uploads keep their sub-folder structure.</li>
              <li>Upload progress shows in the bottom-right card. Keep the tab open until it reaches 100%.</li>
              <li>If a file with the same name exists in the folder, you are asked to <strong>Replace</strong> it or keep both — replacing deletes the old copy first.</li>
              <li>If the <strong>New</strong> button is dimmed or you see <strong>“Upload permission denied”</strong>, your account has <strong>canUpload = false</strong> — ask an administrator to enable it.</li>
              <li>Large batches can hit your quota — see <a href="#quota" className="text-[#8ab4f8] hover:underline">Storage &amp; quota</a> below.</li>
            </ul>
          </Section>

          <Section id="organize" title="Organizing: create, rename, move, copy, star">
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>New folder:</strong> New → New folder, type a name (defaults to “Untitled folder”). Open a folder first if you want the new folder inside it — breadcrumbs at the top show where you are.</li>
              <li><strong>Rename / Move / Copy / Star:</strong> open the <strong>⋮ (More actions)</strong> menu on a file or folder. Move and Copy ask for the destination folder.</li>
              <li>Each action needs its permission (<strong>canRename / canMove / canCopy / canEdit</strong>). A <strong>403</strong> error means that permission is off for you — contact your administrator.</li>
              <li><strong>Star</strong> pins an item in Starred without moving it. Unstar from the same menu.</li>
            </ul>
          </Section>

          <Section id="search-preview" title="Search, view & preview">
            <ul className="list-disc pl-5 space-y-1">
              <li>Use the top <strong>search box</strong> to filter by file or folder name in the current view.</li>
              <li>Toggle <strong>list</strong> (details + size) or <strong>grid</strong> (thumbnails) from the header — your choice is remembered on this browser.</li>
              <li>Click a file to open the <strong>preview</strong>: images, PDFs, text, Word (<strong>.docx</strong>) and Excel (<strong>.xlsx</strong>) open in-browser. Other types download instead.</li>
              <li>File-type icons and sizes help spot large files when you are near quota.</li>
            </ul>
          </Section>

          <Section id="quota" title="Storage & quota">
            <ul className="list-disc pl-5 space-y-1">
              <li>Default quota is <strong>200 MB per user</strong>. Your usage bar lives at the bottom of the left menu (e.g. “120 MB / 200 MB”).</li>
              <li>Quota counts file sizes only — folders cost 0. Trashed files still count until deleted forever.</li>
              <li>Over quota, uploads stop with <strong>“Storage limit exceeded” (HTTP 413)</strong>. Free space (empty Trash, delete large files) or ask an admin to raise your <strong>storageLimitBytes</strong> (empty / null = unlimited).</li>
              <li>Administrators see totals in <strong>/admin → Overview</strong>.</li>
            </ul>
          </Section>

          <Section id="sharing" title="Sharing files">
            <ul className="list-disc pl-5 space-y-1">
              <li>Sharing is <strong>file-based</strong> — folders cannot be shared by public link.</li>
              <li>Open the file&apos;s <strong>Share</strong> dialog: <strong>Only you</strong> (private, default) vs <strong>Anyone with the link</strong> (public link, no login needed).</li>
              <li>The public link looks like <strong>/share/&lt;token&gt;</strong>. Anyone holding it can view/download — only share what is safe to be public.</li>
              <li>To revoke, set the file back to <strong>Only you</strong> — the old token stops working.</li>
              <li>If sharing is blocked with <strong>403</strong>, your <strong>canShare</strong> permission is off. Local-disk uploads are served via public URLs so share links work — do not upload strictly-confidential material expecting auth-only URLs.</li>
            </ul>
          </Section>

          <Section id="trash" title="Trash, restore & delete forever">
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Move to Trash</strong> hides the item but keeps it recoverable — open <strong>Trash</strong> to <strong>Restore</strong> or <strong>Delete forever</strong>.</li>
              <li><strong>Delete forever</strong> (and admin removal) is irreversible and frees quota immediately. Keep your own backups of critical work.</li>
              <li>Deleting needs <strong>canDelete</strong> — most users have this off by default; admins can toggle it per user.</li>
            </ul>
          </Section>

          <Section id="permissions" title="Permissions & your profile">
            <ul className="list-disc pl-5 space-y-1">
              <li>Your account carries per-action flags: <strong>canUpload, canDownload, canRename, canMove, canCopy, canShare, canEdit, canDelete</strong>, plus <strong>isActive / isApproved / role</strong>. Changes by an admin apply on your next request (no re-login needed).</li>
              <li>Missing buttons or 403 errors are permission enforcement, not bugs — note the exact message and ask your administrator.</li>
              <li>Update your name, department or profile from the account menu, and change your password via <strong>Change password</strong> while signed in.</li>
              <li>Admins manage everything in <strong>/admin</strong>: pending approvals, users, roles, permissions, quotas and allowed email domains.</li>
            </ul>
          </Section>

          <Section id="troubleshooting" title="Troubleshooting">
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>“Wrong password”</strong> — retry; caps-lock is the usual cause. Still failing → admin reset.</li>
              <li><strong>“Account pending admin approval”</strong> — wait for approval in /admin → Pending.</li>
              <li><strong>“Account disabled”</strong> — an admin set isActive=false; ask to be re-enabled.</li>
              <li><strong>“Email domain is not allowed”</strong> — your @domain is not in AllowedDomain; admin must add it (e.g. company.com).</li>
              <li><strong>“Upload permission denied” / 403</strong> — relevant can* flag is off.</li>
              <li><strong>“Storage limit exceeded” / 413</strong> — over quota; empty Trash or request a limit raise.</li>
              <li><strong>Share link 404</strong> — only files (not folders) have tokens; ensure the file is still “Anyone with the link” and the URL is …/share/&lt;token&gt;.</li>
              <li><strong>Page 404 at “/”</strong> — expected: the app lives under <strong>/wdrive</strong>; always use /wdrive/… URLs.</li>
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
