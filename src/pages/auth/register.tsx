import { useState } from "react";
import { useRouter } from "next/router";
import Image from "next/image";
import Link from "next/link";

/* Dark sign-up matching the sign-in card */
export default function Register() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [icNumber, setIcNumber] = useState("");
  const [department, setDepartment] = useState("");
  const [profile, setProfile] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const inputCls =
    "h-12 w-full rounded-[4px] border border-[#8e918f] bg-transparent px-4 text-[15px] text-white outline-none placeholder:text-[#9aa0a6] focus:border-[#8ab4f8] focus:border-2";

  const submit = async () => {
    setMsg(null);
    if (!name.trim()) { setMsg("Name is required"); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setMsg("Enter a valid email"); return; }
    if (password.length < 4) { setMsg("Password min 4 chars"); return; }
    if (!icNumber.trim()) { setMsg("IC number is required"); return; }
    if (!department.trim()) { setMsg("Department is required"); return; }
    setLoading(true);
    try {
      const res = await fetch("/wdrive/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, icNumber, department, profile }),
      });
      const j = await res.json().catch(() => ({})) as any;
      if (!res.ok) { setMsg(j.error || "Registration failed"); return; }
      setDone(true);
    } catch (e: any) {
      setMsg(String(e.message || e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#202124] flex flex-col" style={{ fontFamily: '"Google Sans", Roboto, Arial, sans-serif' }}>
      <div className="flex flex-1 items-center justify-center p-4">
        <div className="w-full max-w-[560px] bg-[#0e0e0e] rounded-[28px] border border-[#3c4043]/30 shadow-[0_1px_3px_rgba(0,0,0,0.5)] px-6 py-8 md:px-10">
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
              <h1 className="text-[28px] leading-9 font-normal text-white tracking-tight">Create account</h1>
              <p className="text-[14px] text-[#e8eaed]">to continue to Intranet</p>
            </div>
          </div>

          {done ? (
            <div className="mt-8 text-center">
              <p className="text-[16px] text-white">Request submitted</p>
              <p className="mt-2 text-sm text-[#9aa0a6]">Your account is pending admin approval. You will be able to sign in once approved.</p>
              <Link href="/auth/signin" className="mt-6 inline-block h-9 rounded-full bg-[#a8c7fa] px-6 py-2 text-sm font-medium text-[#062e6f]">Back to Sign in</Link>
            </div>
          ) : (
            <div className="mt-6 space-y-3">
              <input value={name} onChange={e=>setName(e.target.value)} placeholder="Full name *" className={inputCls} />
              <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email *" type="email" className={inputCls} />
              <div className="relative">
                <input value={password} onChange={e=>setPassword(e.target.value)} placeholder="Password (≥4) *" type={showPw?"text":"password"} className={`${inputCls} pr-12`} />
                <button type="button" onClick={()=>setShowPw(v=>!v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#8ab4f8]">{showPw?"Hide":"Show"}</button>
              </div>
              <input value={icNumber} onChange={e=>setIcNumber(e.target.value)} placeholder="IC number *" className={inputCls} />
              <input value={department} onChange={e=>setDepartment(e.target.value)} placeholder="Department *" className={inputCls} />
              <textarea value={profile} onChange={e=>setProfile(e.target.value)} placeholder="Profile / job title (optional)" rows={3} className={`${inputCls} h-auto py-3`} />
              {msg && <p className="text-xs text-[#f28b82]">{msg}</p>}
              <div className="flex items-center justify-end gap-3 pt-2">
                <Link href="/auth/signin" className="h-9 rounded-full px-6 py-2 text-sm font-medium text-[#8ab4f8] hover:bg-[#1e3a5f]/40">Sign in instead</Link>
                <button
                  onClick={submit}
                  disabled={loading}
                  className="h-9 min-w-[80px] rounded-full bg-[#a8c7fa] px-6 text-sm font-medium text-[#062e6f] disabled:opacity-50"
                >
                  {loading ? <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-[#062e6f] border-t-transparent" /> : "Register"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
