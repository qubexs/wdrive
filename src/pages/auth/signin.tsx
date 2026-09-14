import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/router";
import Image from "next/image";
import Link from "next/link";

/* Dark intranet sign-in card */
export default function SignIn() {
  const router = useRouter();
  const callbackUrl = (router.query.callbackUrl as string) || "/drive/my-drive";
  const err = router.query.error as string | undefined;

  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(err ? "Couldn't find your account. Check your email or contact your administrator." : null);
  const [touched, setTouched] = useState(false);

  const emailOk = email.trim().length > 0 && (email.includes("@") ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) : email.trim().length >= 6);
  const pwOk = password.length >= 1;

  const handleNext = () => {
    setTouched(true);
    if (step === 1) {
      if (!emailOk) { setMsg("Enter an email or phone number"); return; }
      setMsg(null); setTouched(false); setStep(2); return;
    }
    void handleSignIn();
  };

  const handleSignIn = async () => {
    if (!pwOk) { setMsg("Enter a password"); return; }
    setLoading(true); setMsg(null);
    const res = await signIn("credentials", { email, password, callbackUrl, redirect: false });
    if (res?.error) {
      if (res.error === "PendingApproval") setMsg("Account pending admin approval. Please wait or contact your administrator.");
      else if (res.error === "AccountDisabled") setMsg("Account disabled. Contact your administrator.");
      else setMsg("Wrong password. Try again.");
      setLoading(false);
      return;
    }
    if (res?.ok) void router.push(callbackUrl);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#202124] flex flex-col" style={{ fontFamily: '"Google Sans", Roboto, Arial, sans-serif' }}>
      <div className="flex flex-1 items-center justify-center p-4 md:p-4">
        {/* card dark like screenshot - curve edge visible */}
        <div className="w-full max-w-[840px] bg-[#0e0e0e] rounded-[28px] flex flex-col md:flex-row overflow-hidden min-h-[360px] border border-[#3c4043]/30 shadow-[0_1px_3px_rgba(0,0,0,0.5)]">
          {/* left */}
          <div className="px-6 pt-8 pb-6 md:w-[50%] md:px-10 md:pt-10 flex flex-col">
            <div className="h-10 w-10">
              <Image
                src={`${router.basePath}/wpre.png`}
                alt="logo"
                width={40}
                height={40}
                className="h-10 w-10 object-contain"
                priority
              />
            </div>
            <h1 className="mt-6 text-[36px] leading-[44px] font-normal text-white tracking-tight">Sign in</h1>
            <p className="mt-3 text-[16px] leading-6 text-[#e8eaed]">to continue to Intranet</p>
          </div>

          {/* right form */}
          <div className="flex flex-1 flex-col px-6 pb-8 pt-2 md:px-10 md:py-10 md:justify-center">
            {step===2 && (
              <button onClick={()=>setStep(1)} className="mb-6 self-start inline-flex items-center gap-2 rounded-full border border-[#5f6368] px-3 py-1 text-sm text-[#e8eaed] hover:bg-[#1e1f20]">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#8ab4f8] text-[11px] font-medium text-[#202124]">{(email[0]||'?').toUpperCase()}</span>
                <span className="max-w-[220px] truncate text-[#e8eaed]">{email}</span>
                <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#e8eaed" d="M7 10l5 5 5-5z"/></svg>
              </button>
            )}

            <div className="min-h-[18px]">
              {touched && msg && step===1 && !emailOk && <p className="mb-1 text-xs text-[#f28b82] flex items-center gap-2"><svg width="16" height="16" viewBox="0 0 24 24"><path fill="#f28b82" d="M11 7h2v2h-2zm0 4h2v6h-2zm1-9C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/></svg>Enter an email or phone number</p>}
              {msg && step===2 && <p className="mb-3 text-xs text-[#f28b82]">{msg}</p>}
            </div>

            {step===1 ? (
              <div className="relative mt-2">
                <input
                  value={email}
                  onChange={(e)=>{setEmail(e.target.value); if(touched) setMsg(null);}}
                  onBlur={()=>setTouched(true)}
                  onKeyDown={(e)=>e.key==='Enter' && handleNext()}
                  placeholder=" "
                  autoFocus
                  type="text"
                  aria-label="Email or phone"
                  className={`peer h-14 w-full rounded-[4px] border bg-transparent px-4 pt-2 text-[16px] text-white outline-none placeholder-transparent ${touched && !emailOk ? "border-[#f28b82] focus:border-[#f28b82] border-2" : "border-[#8e918f] focus:border-[#8ab4f8] focus:border-2"}`}
                />
                <label className={`pointer-events-none absolute left-4 px-1 bg-[#0e0e0e] transition-all peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-[16px] peer-focus:top-0 peer-focus:text-xs peer-[&:not(:placeholder-shown)]:top-0 peer-[&:not(:placeholder-shown)]:text-xs ${touched && !emailOk ? "top-0 text-xs text-[#f28b82] peer-focus:text-[#f28b82]" : "top-1/2 text-[16px] text-[#e8eaed] peer-focus:text-[#8ab4f8]"}`}>Email or phone</label>
              </div>
            ) : (
              <div className="relative mt-2">
                <input
                  value={password}
                  onChange={(e)=>setPassword(e.target.value)}
                  onKeyDown={(e)=>e.key==='Enter' && handleNext()}
                  placeholder=" "
                  autoFocus
                  type={showPw?"text":"password"}
                  aria-label="Enter your password"
                  className={`peer h-14 w-full rounded-[4px] border bg-transparent px-4 pr-12 pt-2 text-[16px] text-white outline-none placeholder-transparent ${msg ? "border-[#f28b82] focus:border-[#f28b82] border-2" : "border-[#8e918f] focus:border-[#8ab4f8] focus:border-2"}`}
                />
                <label className={`pointer-events-none absolute left-4 px-1 bg-[#0e0e0e] transition-all peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-[16px] peer-focus:top-0 peer-focus:text-xs peer-[&:not(:placeholder-shown)]:top-0 peer-[&:not(:placeholder-shown)]:text-xs ${msg ? "top-0 text-xs text-[#f28b82] peer-focus:text-[#f28b82]" : "top-1/2 text-[16px] text-[#e8eaed] peer-focus:text-[#8ab4f8]"}`}>Enter your password</label>
              </div>
            )}

            {step===1 ? (
              <>
                <div className="mt-3">
                  <Link href="/help#forgot-email" className="text-sm font-medium text-[#8ab4f8] hover:underline">Forgot email?</Link>
                </div>
                <div className="mt-10 text-[14px] leading-5 text-[#e8eaed]">
                  <p>Not your computer? Use Guest mode to sign in privately. <Link href="/help#guest-mode" className="font-medium text-[#8ab4f8] hover:underline">Learn more</Link></p>
                  <p className="mt-1"><Link href="/help#guest-mode" className="font-medium text-[#8ab4f8] hover:underline">about using Guest mode</Link></p>
                </div>
              </>
            ) : (
              <label className="mt-4 flex items-center gap-3 cursor-pointer w-fit select-none">
                <span className="relative inline-flex h-[18px] w-[18px] items-center justify-center rounded-[2px] border-2 border-[#8e918f] peer-checked:border-[#8ab4f8] peer-checked:bg-[#8ab4f8]">
                  <input type="checkbox" checked={showPw} onChange={(e)=>setShowPw(e.target.checked)} className="peer sr-only" />
                  <svg className="hidden peer-checked:block text-[#202124]" width="12" height="12" viewBox="0 0 12 10"><path fill="currentColor" d="M4.2 7.2L1.5 4.5 0 6l4.2 4.2L12 2.4 10.5 1z"/></svg>
                </span>
                <span className="text-sm text-[#e8eaed]">Show password</span>
              </label>
            )}

            <div className="mt-8 flex items-center justify-end gap-3 pt-2">
              <button onClick={()=> step===2 ? setStep(1) : void router.push("/auth/register")} type="button" className="h-9 rounded-full px-6 text-sm font-medium text-[#8ab4f8] hover:bg-[#1e3a5f]/40">Create account</button>
              <button
                onClick={handleNext}
                disabled={loading}
                className="h-9 min-w-[80px] rounded-full bg-[#a8c7fa] px-6 text-sm font-medium tracking-[0.25px] text-[#062e6f] hover:bg-[#a8c7fa] hover:shadow disabled:opacity-50"
              >
                {loading ? <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-[#062e6f] border-t-transparent" /> : "Next"}
              </button>
            </div>
          </div>
        </div>
      </div>

      <footer className="mx-auto flex w-full max-w-[840px] items-center justify-between px-6 py-4 text-[12px] text-[#e8eaed] md:px-0">
        <div className="flex items-center gap-1">
          <select defaultValue="en-US" className="h-8 appearance-none bg-transparent pl-2 pr-6 text-xs text-[#e8eaed] outline-none">
            <option>English (United States)</option>
          </select>
          <svg width="18" height="18" viewBox="0 0 24 24" className="-ml-5 pointer-events-none"><path fill="#e8eaed" d="M7 10l5 5 5-5z"/></svg>
        </div>
        <ul className="flex gap-4 text-xs">
          <li><Link href="/help" className="px-2 py-1 hover:bg-[#2d2e30] rounded">Help</Link></li>
          <li><Link href="/privacy" className="px-2 py-1 hover:bg-[#2d2e30] rounded">Privacy</Link></li>
          <li><Link href="/terms" className="px-2 py-1 hover:bg-[#2d2e30] rounded">Terms</Link></li>
        </ul>
      </footer>
    </div>
  );
}
