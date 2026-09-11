import React, { useState } from "react";

export function ChangePasswordModal({ onClose }: { onClose: () => void }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setMsg(null);
    if (next.length < 4) { setMsg("New password min 4 chars"); return; }
    if (next !== confirm) { setMsg("Confirm does not match"); return; }
    setLoading(true);
    try {
      const res = await fetch("/wdrive/api/user/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      });
      const j = await res.json().catch(() => ({})) as any;
      if (!res.ok) { setMsg(j.error || "Failed"); return; }
      setOk(true);
      setTimeout(onClose, 1200);
    } catch (e: any) { setMsg(String(e.message || e)); }
    finally { setLoading(false); }
  };

  return (
    <div onClick={onClose} className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 p-4">
      <div onClick={e=>e.stopPropagation()} className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
        <h3 className="text-lg font-medium">Change password</h3>
        <p className="mt-1 text-sm text-gray-500">For {typeof window !== 'undefined' ? '' : ''}your account</p>
        <div className="mt-4 space-y-3">
          <input value={current} onChange={e=>setCurrent(e.target.value)} type="password" placeholder="Current password" className="w-full rounded border px-3 py-2 text-sm outline-none focus:border-[#1a73e8]" />
          <input value={next} onChange={e=>setNext(e.target.value)} type="password" placeholder="New password (≥4)" className="w-full rounded border px-3 py-2 text-sm outline-none focus:border-[#1a73e8]" />
          <input value={confirm} onChange={e=>setConfirm(e.target.value)} type="password" placeholder="Confirm new password" className="w-full rounded border px-3 py-2 text-sm outline-none focus:border-[#1a73e8]" />
          {msg && <p className="text-sm text-red-600">{msg}</p>}
          {ok && <p className="text-sm text-green-600">Password updated</p>}
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-full px-5 py-2 text-sm hover:bg-gray-100">Cancel</button>
          <button onClick={submit} disabled={loading} className="rounded-full bg-[#1a73e8] px-6 py-2 text-sm font-medium text-white hover:bg-[#1765cc] disabled:opacity-50">{loading ? "..." : "Update"}</button>
        </div>
      </div>
    </div>
  );
}

export function UserManageModal({ onClose }: { onClose: () => void }) {
  const [users, setUsers] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [msg, setMsg] = React.useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const r = await fetch("/wdrive/api/user/list");
    const j = await r.json().catch(()=>[]) as any;
    setUsers(Array.isArray(j)?j:[]);
    setLoading(false);
  };
  React.useEffect(()=>{ void load(); }, []);

  const create = async () => {
    setMsg(null);
    if (!email || !password) { setMsg("email/password required"); return; }
    const r = await fetch("/wdrive/api/user/list", { method: "POST", headers: { "Content-Type":"application/json" }, body: JSON.stringify({ email, password }) });
    const j = await r.json().catch(()=>({})) as any;
    if (!r.ok) { setMsg(j.error||"Failed"); return; }
    setEmail(""); setPassword("");
    void load();
  };
  const resetPw = async (id: string) => {
    const np = prompt("New password for user (≥4):");
    if (!np || np.length < 4) return;
    const r = await fetch("/wdrive/api/user/password", { method: "PATCH", headers: { "Content-Type":"application/json" }, body: JSON.stringify({ targetUserId: id, newPassword: np }) });
    const j = await r.json().catch(()=>({})) as any;
    if (!r.ok) alert(j.error||"Failed"); else alert("Password reset");
  };
  const del = async (id: string) => {
    if (!confirm("Delete user? Files remain but owner orphaned.")) return;
    const r = await fetch("/wdrive/api/user/list", { method: "DELETE", headers: { "Content-Type":"application/json" }, body: JSON.stringify({ userId: id }) });
    const j = await r.json().catch(()=>({})) as any;
    if (!r.ok) alert(j.error||"Failed"); else void load();
  };

  return (
    <div onClick={onClose} className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 p-4">
      <div onClick={e=>e.stopPropagation()} className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h3 className="text-lg font-medium">User management <span className="text-xs font-normal text-gray-500">(admin: demo@local.dev)</span></h3>
          <button onClick={onClose} className="rounded-full p-2 hover:bg-gray-100">✕</button>
        </div>
        <div className="flex-1 overflow-auto p-6">
          <div className="mb-4 flex gap-2">
            <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="new@email" className="flex-1 rounded border px-3 py-2 text-sm" />
            <input value={password} onChange={e=>setPassword(e.target.value)} placeholder="password" type="password" className="flex-1 rounded border px-3 py-2 text-sm" />
            <button onClick={create} className="rounded bg-[#1a73e8] px-4 py-2 text-sm text-white">Create</button>
          </div>
          {msg && <p className="mb-2 text-sm text-red-600">{msg}</p>}
          {loading ? <p className="text-sm">Loading...</p> : (
            <table className="w-full text-left text-sm">
              <thead><tr className="border-b text-gray-500"><th className="py-2">Email</th><th>Name</th><th>Actions</th></tr></thead>
              <tbody>
                {users.map((u:any)=>(
                  <tr key={u.id} className="border-b">
                    <td className="py-2">{u.email}</td><td>{u.name}</td>
                    <td className="flex gap-2 py-2">
                      <button onClick={()=>resetPw(u.id)} className="rounded bg-gray-100 px-2 py-1 text-xs hover:bg-gray-200">Reset PW</button>
                      <button onClick={()=>del(u.id)} className="rounded bg-red-50 px-2 py-1 text-xs text-red-600 hover:bg-red-100">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="border-t px-6 py-3 text-right"><button onClick={onClose} className="rounded-full px-5 py-2 text-sm hover:bg-gray-100">Close</button></div>
      </div>
    </div>
  );
}
