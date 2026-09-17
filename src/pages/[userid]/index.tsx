import { useEffect, useState, type ReactNode } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import Link from "next/link";
import { MdLock, MdPerson } from "react-icons/md";
import Header from "@/components/headerComponents/Header";
import UserAvatar from "@/components/UserAvatar";
import { ChangePasswordModal } from "@/components/PasswordModal";
import DepartmentCombobox, { type DepartmentOption } from "@/components/DepartmentCombobox";

type Section = "profile" | "security";

type ProfileData = {
  id: string;
  email: string;
  name: string;
  image: string | null;
  role?: string;
  department: string | null;
  departmentId?: string | null;
  profile?: string | null;
  icNumber?: string | null;
};

export default function UserProfilePage() {
  const router = useRouter();
  const { userid } = router.query;
  const targetId = typeof userid === "string" ? userid : "";
  const { data: session, status, update } = useSession();
  const isSelf = !!session?.user?.id && session.user.id === targetId;

  const [section, setSection] = useState<Section>("profile");
  const [data, setData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showPw, setShowPw] = useState(false);

  // edit drafts
  const [name, setName] = useState("");
  const [department, setDepartment] = useState<DepartmentOption | null>(null);
  const [profile, setProfile] = useState("");

  const load = async (id: string) => {
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch(`/wdrive/api/user/profile?userId=${encodeURIComponent(id)}`);
      const j = await res.json().catch(() => ({}));
      if (!res.ok) { setMsg(j.error || "Failed to load profile"); setData(null); return; }
      setData(j);
      setName(j.name ?? "");
      setDepartment(j.department ? { id: j.departmentId ?? j.department, name: j.department } : null);
      setProfile(j.profile ?? "");
    } catch (e: any) {
      setMsg(String(e.message || e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === "unauthenticated") void router.push("/auth/signin");
    if (status === "authenticated" && targetId) void load(targetId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, targetId]);

  const save = async () => {
    if (!isSelf) return;
    setMsg(null);
    if (!name.trim()) { setMsg("Name required"); return; }
    if (!department) { setMsg("Please select a department from the list"); return; }
    setSaving(true);
    try {
      const res = await fetch(`/wdrive/api/user/profile?userId=${targetId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, departmentId: department.id, department: department.name, profile }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) { setMsg(j.error || "Save failed"); return; }
      setData(prev => prev ? { ...prev, ...j } : j);
      setMsg("Profile updated");
      void update();
    } catch (e: any) {
      setMsg(String(e.message || e));
    } finally {
      setSaving(false);
    }
  };

  const uploadAvatar = async (file: File) => {
    if (!isSelf) return;
    setMsg(null);
    if (!file.type.startsWith("image/")) { setMsg("Please choose an image file"); return; }
    if (file.size > 5 * 1024 * 1024) { setMsg("Image max 5 MB"); return; }
    setUploading(true);
    try {
      const buf = await file.arrayBuffer();
      let bin = "";
      const bytes = new Uint8Array(buf);
      for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]!);
      const res = await fetch("/wdrive/api/upload/local", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: file.name,
          folder: "google-drive-clone/avatars",
          dataBase64: btoa(bin),
          mimeType: file.type,
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) { setMsg(j.error || "Upload failed"); return; }
      const pRes = await fetch(`/wdrive/api/user/profile?userId=${targetId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: j.secure_url }),
      });
      const pj = await pRes.json().catch(() => ({}));
      if (!pRes.ok) { setMsg(pj.error || "Save failed"); return; }
      setData(prev => prev ? { ...prev, image: pj.image } : prev);
      setMsg("Avatar updated");
      void update();
    } catch (e: any) {
      setMsg(String(e.message || e));
    } finally {
      setUploading(false);
    }
  };

  const navItems = (
    [
      { key: "profile", label: "Profile", icon: <MdPerson className="tablet:h-5 tablet:w-5 h-6 w-6" /> },
      ...(isSelf ? [{ key: "security", label: "Security", icon: <MdLock className="tablet:h-5 tablet:w-5 h-6 w-6" /> }] : []),
    ] as { key: Section; label: string; icon: ReactNode }[]
  );

  if (status !== "authenticated") {
    return <div className="flex h-[80vh] items-center justify-center p-8 text-textC">Checking access…</div>;
  }

  const inputCls = "w-full rounded border px-3 py-2 text-sm outline-none focus:border-[#1a73e8] disabled:bg-gray-100";

  return (
    <main className="flex h-screen flex-col overflow-hidden bg-bgc">
      <Header />
      <section className="mb-5 flex flex-1 overflow-hidden px-5 pr-16">
        <div>
          <section className="relative h-[90vh] w-16 space-y-4 duration-500 tablet:w-60">
            <nav className="space-y-0.5 pr-5">
              {navItems.map(s => (
                <button
                  key={s.key}
                  onClick={()=>setSection(s.key)}
                  className={`tablet:justify-normal tablet:space-x-3 tablet:px-4 tablet:py-1.5 flex w-full items-center justify-center rounded-full p-2 hover:bg-darkC ${section===s.key ? "bg-[#C2E7FF]" : ""}`}
                >
                  {s.icon}
                  <span className="tablet:block hidden">{s.label}</span>
                </button>
              ))}
            </nav>
          </section>
        </div>
        <div className="flex flex-1">
          <div className="h-[90vh] w-full overflow-hidden rounded-2xl bg-white">
            <div className="h-full overflow-y-auto p-5">
              <div className="w-full">
                <div className="mb-4 flex items-center justify-between">
                  <h1 className="text-2xl font-medium text-textC">{isSelf ? "My profile" : "User profile"}</h1>
                  <Link href="/drive/my-drive" className="rounded-full bg-white px-4 py-2 text-sm shadow hover:bg-darkC">← Back to Drive</Link>
                </div>

                {msg && <div className="mb-4 rounded bg-yellow-50 px-4 py-2 text-sm text-yellow-800">{msg}</div>}

                {loading ? (
                  <p className="py-8 text-center text-sm text-gray-400">Loading…</p>
                ) : !data ? (
                  <p className="py-8 text-center text-sm text-gray-400">User not found</p>
                ) : section === "profile" ? (
                  <div className="rounded-xl bg-white p-4 shadow-sm">
                    <div className="flex flex-col gap-6 md:flex-row">
                      <div className="flex flex-col items-center gap-3">
                        <div className="h-28 w-28 overflow-hidden rounded-full border text-5xl">
                          <UserAvatar
                            name={data.name}
                            email={data.email}
                            image={data.image}
                          />
                        </div>
                        {isSelf && (
                          <label className="cursor-pointer rounded-full bg-gray-100 px-4 py-1.5 text-xs hover:bg-gray-200">
                            {uploading ? "Uploading…" : "Change avatar"}
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              disabled={uploading}
                              onChange={e => { const f = e.target.files?.[0]; e.target.value = ""; if (f) void uploadAvatar(f); }}
                            />
                          </label>
                        )}
                      </div>
                      <div className="flex-1 space-y-3">
                        <div>
                          <label className="text-xs text-gray-500">Name</label>
                          <input value={name} onChange={e=>setName(e.target.value)} disabled={!isSelf} className={inputCls} />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500">Email</label>
                          <input value={data.email} disabled className={inputCls} />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500">Department</label>
                          {isSelf ? (
                            <DepartmentCombobox value={department} onChange={setDepartment} required placeholder="Type to search department / unit…" />
                          ) : (
                            <input value={data.department ?? "—"} disabled className={inputCls} />
                          )}
                        </div>
                        <div>
                          <label className="text-xs text-gray-500">Profile</label>
                          <textarea value={profile} onChange={e=>setProfile(e.target.value)} disabled={!isSelf} placeholder="—" rows={3} className={inputCls} />
                        </div>
                        {isSelf && data.icNumber !== undefined && (
                          <div>
                            <label className="text-xs text-gray-500">IC number (managed by admin)</label>
                            <input value={data.icNumber ?? "—"} disabled className={inputCls} />
                          </div>
                        )}
                        {isSelf && (
                          <button onClick={save} disabled={saving} className="rounded-full bg-[#1a73e8] px-6 py-2 text-sm font-medium text-white hover:bg-[#1765cc] disabled:opacity-50">
                            {saving ? "Saving…" : "Save changes"}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl bg-white p-4 shadow-sm">
                    <h2 className="mb-3 text-sm font-semibold text-textC">Security</h2>
                    <p className="mb-3 text-xs text-gray-500">Signed in as {data.email}. Use a strong password unique to this intranet.</p>
                    <button onClick={()=>setShowPw(true)} className="rounded-full border border-[#1a73e8] bg-[#1a73e8] px-6 py-2 text-sm text-white hover:bg-[#1765cc]">
                      Change password
                    </button>
                    {showPw && <ChangePasswordModal onClose={()=>setShowPw(false)} />}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
