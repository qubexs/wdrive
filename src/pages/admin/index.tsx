import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import Link from "next/link";
import { MdBusiness, MdDashboard, MdDomain, MdPendingActions, MdPeople } from "react-icons/md";
import Header from "@/components/headerComponents/Header";
import DepartmentCombobox, { type DepartmentOption } from "@/components/DepartmentCombobox";

type AdminUser = {
  id: string;
  email: string;
  name: string;
  role: string;
  canDownload: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canUpload: boolean;
  canRename: boolean;
  canMove: boolean;
  canCopy: boolean;
  canShare: boolean;
  isActive: boolean;
  icNumber?: string;
  department?: string | null;
  departmentId?: string | null;
  profile?: string;
  requestedAt?: string;
  isApproved?: boolean;
  storageLimitBytes?: number;
  fileCount: number;
  storageUsed: number;
};

type DomainRow = {
  id: string;
  domain: string;
  isActive: boolean;
  createdAt: string;
};

type DepartmentRow = {
  id: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  memberCount: number;
};

type Section = "overview" | "pending" | "users" | "domains" | "departments";

const PERM_DEFS: { key: keyof AdminUser; label: string; hint: string }[] = [
  { key: "canUpload", label: "upload", hint: "Create folders, upload files" },
  { key: "canDownload", label: "download", hint: "Preview, open, download files" },
  { key: "canRename", label: "rename", hint: "Rename files & folders" },
  { key: "canMove", label: "move", hint: "Move files & folders" },
  { key: "canCopy", label: "copy", hint: "Copy files & folders" },
  { key: "canShare", label: "share", hint: "Create/revoke share links" },
  { key: "canEdit", label: "edit (star/trash)", hint: "Star, move to bin, restore" },
  { key: "canDelete", label: "remove", hint: "Delete forever" },
];

const DEFAULT_PERMS: Record<string, boolean> = {
  canUpload: true,
  canDownload: true,
  canRename: true,
  canMove: true,
  canCopy: true,
  canShare: true,
  canEdit: true,
  canDelete: false,
};

function formatBytes(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(2)} MB`;
}

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const role = (session?.user as any)?.role;
  const email = session?.user?.email ?? "";
  const isAdmin = role === "ADMIN" || email === "demo@local.dev";

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const [domains, setDomains] = useState<DomainRow[]>([]);
  const [newDomain, setNewDomain] = useState("");
  const [departments, setDepartments] = useState<DepartmentRow[]>([]);
  const [newDept, setNewDept] = useState("");
  const [deptRename, setDeptRename] = useState<Record<string, string>>({});
  const [deptReassign, setDeptReassign] = useState<Record<string, string>>({});
  const [newUserDept, setNewUserDept] = useState<DepartmentOption | null>(null);
  // admin edit-user-profile modal
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [editName, setEditName] = useState("");
  const [editIc, setEditIc] = useState("");
  const [editProfile, setEditProfile] = useState("");
  const [editDept, setEditDept] = useState<DepartmentOption | null>(null);
  const [editSaving, setEditSaving] = useState(false);

  const pending = users.filter(u => !u.isActive && !u.isApproved);
  const [section, setSection] = useState<Section>("overview");
  const [userQuery, setUserQuery] = useState("");
  const [deptFilter, setDeptFilter] = useState<DepartmentOption | null>(null);
  const [quotaDrafts, setQuotaDrafts] = useState<Record<string, string>>({});
  const [quotaUnlimited, setQuotaUnlimited] = useState<Record<string, boolean>>({});
  const [newQuotaMB, setNewQuotaMB] = useState("200");
  const [newQuotaUnlimited, setNewQuotaUnlimited] = useState(false);

  const deptOptions: DepartmentOption[] = useMemo(
    () => departments.map(d => ({ id: d.id, name: d.name + (d.isActive ? "" : " (inactive)") })),
    [departments],
  );
  const deptOptionsActive: DepartmentOption[] = useMemo(
    () => departments.filter(d => d.isActive).map(d => ({ id: d.id, name: d.name })),
    [departments],
  );
  const visibleUsers = users.filter(u => {
    const q = userQuery.trim().toLowerCase();
    const matchQ = !q || [u.name, u.email, u.department].some(v => (v ?? "").toLowerCase().includes(q));
    const matchD = !deptFilter || (u.departmentId ?? "") === deptFilter.id;
    return matchQ && matchD;
  });

  // create form
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState("USER");
  const [newPerms, setNewPerms] = useState<Record<string, boolean>>({ ...DEFAULT_PERMS });
  // per-request approval options (role + perms), keyed by pending user id
  const [approveOpts, setApproveOpts] = useState<Record<string, { role: string; perms: Record<string, boolean> }>>({});
  const getApproveOpt = (id: string) => approveOpts[id] ?? { role: "USER", perms: { ...DEFAULT_PERMS } };
  const setApproveOpt = (id: string, patch: Partial<{ role: string; perms: Record<string, boolean> }>) =>
    setApproveOpts(prev => ({ ...prev, [id]: { ...(prev[id] ?? { role: "USER", perms: { ...DEFAULT_PERMS } }), ...patch } }));

  const load = async () => {
    setLoading(true);
    const [uRes, sRes, dRes, depRes] = await Promise.all([
      fetch("/wdrive/api/admin/users"),
      fetch("/wdrive/api/admin/stats"),
      fetch("/wdrive/api/admin/domains"),
      fetch("/wdrive/api/admin/departments"),
    ]);
    if (uRes.ok) setUsers(await uRes.json());
    else setMsg(`Users: ${uRes.status} ${await uRes.text()}`);
    if (sRes.ok) setStats(await sRes.json());
    if (dRes.ok) setDomains(await dRes.json());
    else setMsg(`Domains: ${dRes.status} ${await dRes.text()}`);
    if (depRes.ok) setDepartments(await depRes.json());
    else setMsg(`Departments: ${depRes.status} ${await depRes.text()}`);
    setLoading(false);
  };

  useEffect(() => {
    if (status === "unauthenticated") void router.push("/auth/signin");
    if (status === "authenticated" && !isAdmin) void router.push("/drive/my-drive");
    if (status === "authenticated" && isAdmin) void load();
  }, [status, isAdmin]);

  const createUser = async () => {
    setMsg(null);
    if (!newEmail || !newPassword) { setMsg("email/password required"); return; }
    const quotaMB = Number(newQuotaMB);
    if (!newQuotaUnlimited && (!quotaMB || quotaMB < 1)) { setMsg("Quota min 1 MB"); return; }
    const res = await fetch("/wdrive/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: newEmail,
        password: newPassword,
        role: newRole,
        ...newPerms,
        departmentId: newUserDept?.id,
        storageLimitBytes: newQuotaUnlimited ? null : Math.floor(quotaMB * 1024 * 1024),
      }),
    });
    const j = await res.json().catch(() => ({})) as any;
    if (!res.ok) { setMsg(j.error || "Create failed"); return; }
    setNewEmail(""); setNewPassword(""); setNewQuotaMB("200"); setNewQuotaUnlimited(false); setNewUserDept(null);
    setMsg(`Created ${j.email}`);
    void load();
  };

  const updatePerm = async (u: AdminUser, patch: Partial<AdminUser>) => {
    const res = await fetch("/wdrive/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: u.id, ...patch }),
    });
    const j = await res.json().catch(() => ({})) as any;
    if (!res.ok) { setMsg(j.error || "Update failed"); return; }
    void load();
  };

  const toggleActive = async (u: AdminUser) => {
    await updatePerm(u, { isActive: !u.isActive } as any);
  };

  const saveQuota = async (u: AdminUser) => {
    setMsg(null);
    const unlimited = quotaUnlimited[u.id] ?? (u.storageLimitBytes == null);
    if (unlimited) {
      await updatePerm(u, { storageLimitBytes: null } as any);
    } else {
      const mb = Number(quotaDrafts[u.id]);
      if (!mb || mb < 1) { setMsg("Quota min 1 MB"); return; }
      await updatePerm(u, { storageLimitBytes: Math.floor(mb * 1024 * 1024) } as any);
    }
    setQuotaDrafts(prev => { const n = { ...prev }; delete n[u.id]; return n; });
  };

  const approvePending = async (u: AdminUser) => {
    setMsg(null);
    const opt = getApproveOpt(u.id);
    const res = await fetch("/wdrive/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: u.id, isActive: true, isApproved: true, role: opt.role, ...opt.perms }),
    });
    const j = await res.json().catch(() => ({})) as any;
    if (!res.ok) { setMsg(j.error || "Approve failed"); return; }
    setMsg(`Approved ${u.email}`);
    void load();
  };

  const rejectPending = async (u: AdminUser) => {
    if (!confirm(`Reject registration for ${u.email}? The request will be deleted.`)) return;
    const res = await fetch("/wdrive/api/admin/users", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: u.id, hard: true }),
    });
    const j = await res.json().catch(() => ({})) as any;
    if (!res.ok) { setMsg(j.error || "Reject failed"); return; }
    setMsg(`Rejected ${u.email}`);
    void load();
  };

  const setUserDepartment = async (u: AdminUser, dept: DepartmentOption | null) => {
    await updatePerm(u, { departmentId: dept?.id ?? null } as any);
  };

  const openEditUser = (u: AdminUser) => {
    setEditingUser(u);
    setEditName(u.name ?? "");
    setEditIc(u.icNumber ?? "");
    setEditProfile(u.profile ?? "");
    setEditDept(u.department ? { id: u.departmentId ?? u.department, name: u.department } : null);
  };

  const saveEditUser = async () => {
    if (!editingUser) return;
    if (!editName.trim()) { setMsg("Name required"); return; }
    setEditSaving(true);
    try {
      const res = await fetch("/wdrive/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: editingUser.id,
          name: editName.trim(),
          icNumber: editIc.trim() || null,
          profile: editProfile.trim() || null,
          departmentId: editDept?.id ?? null,
        }),
      });
      const j = await res.json().catch(() => ({})) as any;
      if (!res.ok) { setMsg(j.error || "Save failed"); return; }
      setEditingUser(null);
      setMsg(`Profile updated for ${editingUser.email}`);
      void load();
    } finally {
      setEditSaving(false);
    }
  };

  const addDepartment = async () => {
    setMsg(null);
    if (!newDept.trim()) { setMsg("Department name required"); return; }
    const res = await fetch("/wdrive/api/admin/departments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newDept }),
    });
    const j = await res.json().catch(() => ({})) as any;
    if (!res.ok) { setMsg(j.error || "Add department failed"); return; }
    setNewDept("");
    setMsg(`Department ${j.name} added`);
    void load();
  };

  const renameDepartment = async (d: DepartmentRow) => {
    const n = (deptRename[d.id] ?? "").trim();
    if (!n) { setMsg("Name required"); return; }
    const res = await fetch("/wdrive/api/admin/departments", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: d.id, name: n }),
    });
    const j = await res.json().catch(() => ({})) as any;
    if (!res.ok) { setMsg(j.error || "Rename failed"); return; }
    setDeptRename(prev => { const n2 = { ...prev }; delete n2[d.id]; return n2; });
    setMsg(`Renamed to ${j.name} — all members updated`);
    void load();
  };

  const toggleDepartment = async (d: DepartmentRow) => {
    const res = await fetch("/wdrive/api/admin/departments", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: d.id, isActive: !d.isActive }),
    });
    const j = await res.json().catch(() => ({})) as any;
    if (!res.ok) { setMsg(j.error || "Update failed"); return; }
    void load();
  };

  const removeDepartment = async (d: DepartmentRow) => {
    const reassignTo = deptReassign[d.id] || "";
    if (d.memberCount > 0 && !reassignTo) {
      setMsg(`${d.name} has ${d.memberCount} member(s). Pick a reassignment target first, or reassign users manually.`);
      return;
    }
    if (!confirm(d.memberCount > 0 ? `Delete ${d.name} and move ${d.memberCount} member(s)?` : `Delete ${d.name}?`)) return;
    const q = reassignTo ? `?id=${encodeURIComponent(d.id)}&reassignTo=${encodeURIComponent(reassignTo)}` : `?id=${encodeURIComponent(d.id)}`;
    const res = await fetch(`/wdrive/api/admin/departments${q}`, { method: "DELETE" });
    const j = await res.json().catch(() => ({})) as any;
    if (!res.ok) { setMsg(j.error || "Delete failed"); return; }
    setMsg(`Department ${d.name} removed`);
    void load();
  };

  const addDomain = async () => {
    setMsg(null);
    if (!newDomain.trim()) { setMsg("Domain required"); return; }
    const res = await fetch("/wdrive/api/admin/domains", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ domain: newDomain }),
    });
    const j = await res.json().catch(() => ({})) as any;
    if (!res.ok) { setMsg(j.error || "Add domain failed"); return; }
    setNewDomain("");
    setMsg(`Domain ${j.domain} added`);
    void load();
  };

  const toggleDomain = async (d: DomainRow) => {
    const res = await fetch("/wdrive/api/admin/domains", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: d.id, isActive: !d.isActive }),
    });
    const j = await res.json().catch(() => ({})) as any;
    if (!res.ok) { setMsg(j.error || "Update failed"); return; }
    void load();
  };

  const removeDomain = async (d: DomainRow) => {
    if (!confirm(`Remove domain ${d.domain}? New registrations with this domain will be blocked. Existing users are not affected.`)) return;
    const res = await fetch(`/wdrive/api/admin/domains?id=${encodeURIComponent(d.id)}`, { method: "DELETE" });
    const j = await res.json().catch(() => ({})) as any;
    if (!res.ok) { setMsg(j.error || "Delete failed"); return; }
    setMsg(`Domain ${d.domain} removed`);
    void load();
  };

  const removeUser = async (u: AdminUser) => {
    const hard = confirm(`Delete ${u.email}?\nOK = hard delete (removes files), Cancel = soft disable`);
    let body: any = { userId: u.id };
    let url = "/wdrive/api/admin/users";
    let method = "DELETE";
    if (hard) {
      const transfer = prompt("Transfer files to user ID (leave empty to delete files):") ?? "";
      body = { userId: u.id, hard: true, transferTo: transfer || undefined };
      if (!confirm(`Hard delete ${u.email}? This cannot be undone.`)) return;
    }
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const j = await res.json().catch(() => ({})) as any;
    if (!res.ok) { setMsg(j.error || "Delete failed"); return; }
    setMsg(hard ? "Hard deleted" : "Disabled (soft)");
    void load();
  };

  const resetPw = async (u: AdminUser) => {
    const np = prompt(`New password for ${u.email} (≥4):`);
    if (!np || np.length < 4) return;
    const res = await fetch("/wdrive/api/user/password", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetUserId: u.id, newPassword: np }),
    });
    const j = await res.json().catch(() => ({})) as any;
    if (!res.ok) { setMsg(j.error || "Reset failed"); return; }
    setMsg(`Password reset for ${u.email}`);
  };

  if (status !== "authenticated" || !isAdmin) {
    return <div className="flex h-[80vh] items-center justify-center p-8 text-textC">Checking admin access…</div>;
  }

  const navItems = (
    [
      { key: "overview", label: "Overview", icon: <MdDashboard className="tablet:h-5 tablet:w-5 h-6 w-6" /> },
      { key: "pending", label: "Pending", icon: <MdPendingActions className="tablet:h-5 tablet:w-5 h-6 w-6" />, badge: pending.length },
      { key: "users", label: "Users", icon: <MdPeople className="tablet:h-5 tablet:w-5 h-6 w-6" /> },
      { key: "departments", label: "Departments", icon: <MdBusiness className="tablet:h-5 tablet:w-5 h-6 w-6" /> },
      { key: "domains", label: "Domains", icon: <MdDomain className="tablet:h-5 tablet:w-5 h-6 w-6" /> },
    ] as { key: Section; label: string; icon: ReactNode; badge?: number }[]
  );

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
                  {!!s.badge && <span className="tablet:ml-auto rounded-full bg-red-500 px-2 py-0.5 text-[11px] font-semibold text-white">{s.badge}</span>}
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
                  <h1 className="text-2xl font-medium text-textC">Admin dashboard</h1>
                  <Link href="/drive/my-drive" className="rounded-full bg-white px-4 py-2 text-sm shadow hover:bg-darkC">← Back to Drive</Link>
                </div>

                {msg && <div className="mb-4 rounded bg-yellow-50 px-4 py-2 text-sm text-yellow-800">{msg}</div>}
        {section === "overview" && stats && (
          <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
            <div className="rounded-xl bg-white p-4 shadow-sm"><div className="text-xs text-textC">Users</div><div className="text-xl font-semibold">{stats.userCount} <span className="text-xs font-normal text-gray-500">({stats.activeUsers} active, {stats.adminCount} admin)</span></div></div>
            <div className="rounded-xl bg-white p-4 shadow-sm"><div className="text-xs text-textC">Files</div><div className="text-xl font-semibold">{stats.totalFiles}</div></div>
            <div className="rounded-xl bg-white p-4 shadow-sm"><div className="text-xs text-textC">Storage used</div><div className="text-xl font-semibold">{formatBytes(stats.totalStorage)}</div></div>
            <div className="rounded-xl bg-white p-4 shadow-sm"><div className="text-xs text-textC">Limit per user</div><div className="text-xl font-semibold">200 MB</div></div>
          </div>
        )}

        {section === "pending" && (
          <div className="mb-6 rounded-xl bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold text-textC">Pending approvals ({pending.length})</h2>
            {pending.length === 0 ? (
              <p className="py-6 text-center text-sm text-gray-400">No pending requests</p>
            ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b bg-gray-50 text-xs text-gray-500">
                  <tr>
                    <th className="px-4 py-3">Email / Name</th>
                    <th className="px-4 py-3">IC number</th>
                    <th className="px-4 py-3">Department</th>
                    <th className="px-4 py-3">Profile</th>
                    <th className="px-4 py-3">Requested</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Perms</th>
                    <th className="px-4 py-3">Decision</th>
                  </tr>
                </thead>
                <tbody>
                  {pending.map(u => (
                    <tr key={u.id} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="font-medium">{u.email}</div>
                        <div className="text-xs text-gray-500">{u.name}</div>
                      </td>
                      <td className="px-4 py-3 text-xs">{u.icNumber || "—"}</td>
                      <td className="px-4 py-3 text-xs">{u.department || "—"}</td>
                      <td className="px-4 py-3 text-xs">{u.profile || "—"}</td>
                      <td className="px-4 py-3 text-xs">{u.requestedAt ? new Date(u.requestedAt).toLocaleString() : "—"}</td>
                      <td className="px-4 py-3">
                        <select value={getApproveOpt(u.id).role} onChange={e=>setApproveOpt(u.id,{role:e.target.value})} className="rounded border px-2 py-1 text-xs">
                          <option value="USER">USER</option>
                          <option value="ADMIN">ADMIN</option>
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                          {PERM_DEFS.map(p => (
                            <label key={p.key} title={p.hint} className="flex items-center gap-1 whitespace-nowrap">
                              <input type="checkbox" checked={!!getApproveOpt(u.id).perms[p.key]} onChange={e=>setApproveOpt(u.id,{perms:{...getApproveOpt(u.id).perms,[p.key]:e.target.checked}})} /> {p.label}
                            </label>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <button onClick={()=>approvePending(u)} className="rounded-full bg-green-600 px-3 py-1 text-xs text-white hover:bg-green-700">Approve</button>
                          <button onClick={()=>openEditUser(u)} className="rounded-full bg-[#e8f0fe] px-3 py-1 text-xs text-[#1a73e8] hover:bg-[#d2e3fc]">Edit</button>
                          <button onClick={()=>rejectPending(u)} className="rounded-full bg-red-50 px-3 py-1 text-xs text-red-600 hover:bg-red-100">Reject</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            )}
          </div>
        )}

        {section === "domains" && (
        <div className="mb-6 rounded-xl bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-textC">Allowed email domains</h2>
          <p className="mb-3 text-xs text-gray-500">Only these domains can self-register. Applies to new registrations only — existing users are never affected.</p>
          <div className="mb-3 flex gap-2">
            <input value={newDomain} onChange={e=>setNewDomain(e.target.value)} onKeyDown={e=>e.key==="Enter" && addDomain()} placeholder="company.com" className="max-w-xs flex-1 rounded border px-3 py-2 text-sm outline-none focus:border-[#1a73e8]" />
            <button onClick={addDomain} className="rounded-full bg-[#1a73e8] px-5 text-sm font-medium text-white hover:bg-[#1765cc]">Add</button>
          </div>
          {domains.length===0 ? (
            <p className="text-xs text-red-600">No domains — self-registration is fully blocked.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {domains.map(d => (
                <span key={d.id} className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs ${d.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-500"}`}>
                  {d.domain}
                  <button onClick={()=>toggleDomain(d)} title={d.isActive ? "Deactivate" : "Activate"} className="font-semibold underline">{d.isActive ? "active" : "off"}</button>
                  <button onClick={()=>removeDomain(d)} title="Remove" className="font-bold text-red-500">✕</button>
                </span>
              ))}
            </div>
          )}
        </div>
        )}

        {section === "users" && (
        <>
        <div className="mb-6 rounded-xl bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-textC">Add new user</h2>
          <div className="flex flex-col gap-2 md:flex-row md:items-end">
            <div className="flex-1">
              <label className="text-xs text-gray-500">Email</label>
              <input value={newEmail} onChange={e=>setNewEmail(e.target.value)} placeholder="user@example.com" className="w-full rounded border px-3 py-2 text-sm outline-none focus:border-[#1a73e8]" />
            </div>
            <div className="flex-1">
              <label className="text-xs text-gray-500">Password (≥4)</label>
              <input value={newPassword} onChange={e=>setNewPassword(e.target.value)} type="password" placeholder="••••" className="w-full rounded border px-3 py-2 text-sm outline-none focus:border-[#1a73e8]" />
            </div>
            <div className="min-w-[220px] flex-1">
              <label className="text-xs text-gray-500">Department (type to search)</label>
              <DepartmentCombobox value={newUserDept} onChange={setNewUserDept} options={deptOptionsActive} placeholder="Type to search…" allowClear />
            </div>
            <div>
              <label className="text-xs text-gray-500">Role</label>
              <select value={newRole} onChange={e=>setNewRole(e.target.value)} className="w-full rounded border px-3 py-2 text-sm">
                <option value="USER">USER</option>
                <option value="ADMIN">ADMIN</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500">Quota (MB)</label>
              <input value={newQuotaMB} onChange={e=>setNewQuotaMB(e.target.value)} type="number" min={1} disabled={newQuotaUnlimited} className="w-28 rounded border px-3 py-2 text-sm disabled:bg-gray-100" />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={newQuotaUnlimited} onChange={e=>setNewQuotaUnlimited(e.target.checked)} /> Unlimited
            </label>
            <button onClick={createUser} className="h-10 rounded-full bg-[#1a73e8] px-6 text-sm font-medium text-white hover:bg-[#1765cc]">Create</button>
          </div>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm">
            {PERM_DEFS.map(p => (
              <label key={p.key} title={p.hint} className="flex items-center gap-2">
                <input type="checkbox" checked={!!newPerms[p.key]} onChange={e=>setNewPerms(prev=>({...prev,[p.key]:e.target.checked}))} /> {p.label}
              </label>
            ))}
          </div>
          <p className="mt-2 text-xs text-gray-500">upload = new folders/files • download = preview/open/fetch • rename / move / copy / share = per-action • edit = star, bin, restore • remove = delete forever & hard user delete • Disable = soft delete.</p>
        </div>

        <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-center">
          <input value={userQuery} onChange={e=>setUserQuery(e.target.value)} placeholder="Search name, email, department…" className="max-w-sm flex-1 rounded border px-3 py-2 text-sm outline-none focus:border-[#1a73e8]" />
          <div className="min-w-[240px]">
            <DepartmentCombobox value={deptFilter} onChange={setDeptFilter} options={deptOptions} placeholder="All departments — type to filter…" allowClear />
          </div>
          <span className="text-xs text-gray-500">{visibleUsers.length} of {users.length}</span>
        </div>

        <div className="overflow-x-auto rounded-xl bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-gray-50 text-xs text-gray-500">
              <tr>
                <th className="px-4 py-3">Email / Name</th>
                <th className="px-4 py-3">Department</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Perms</th>
                <th className="px-4 py-3">Usage / Quota</th>
                <th className="px-4 py-3">Active</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">Loading…</td></tr>
              ) : visibleUsers.length===0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">{users.length===0 ? "No users" : "No users match"}</td></tr>
              ) : visibleUsers.map(u => (
                <tr key={u.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-medium">{u.email}</div>
                    <div className="text-xs text-gray-500">{u.name} • {u.id.slice(0,6)}</div>
                  </td>
                  <td className="px-4 py-3 text-xs min-w-[200px]">
                    <DepartmentCombobox
                      value={u.department ? { id: u.departmentId ?? u.department, name: u.department } : null}
                      onChange={d => setUserDepartment(u, d)}
                      options={deptOptions}
                      compact
                      allowClear
                      placeholder="Type to search…"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <select value={u.role} onChange={e=>updatePerm(u,{role:e.target.value} as any)} className="rounded border px-2 py-1 text-xs" disabled={u.id===session?.user.id}>
                      <option value="USER">USER</option>
                      <option value="ADMIN">ADMIN</option>
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                      {PERM_DEFS.map(p => (
                        <label key={p.key} title={p.hint} className="flex items-center gap-1 whitespace-nowrap">
                          <input type="checkbox" checked={!!u[p.key]} onChange={e=>updatePerm(u,{[p.key]:e.target.checked} as any)} /> {p.label}
                        </label>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs">{u.fileCount} files<br/>{formatBytes(u.storageUsed)} / {u.storageLimitBytes == null ? "∞" : formatBytes(u.storageLimitBytes)}
                    <div className="mt-1 flex items-center gap-1">
                      <input value={quotaDrafts[u.id] ?? (u.storageLimitBytes == null ? "" : String(Math.round(u.storageLimitBytes / 1048576)))} onChange={e=>setQuotaDrafts(prev=>({...prev,[u.id]:e.target.value}))} type="number" min={1} disabled={quotaUnlimited[u.id] ?? (u.storageLimitBytes == null)} className="w-20 rounded border px-1 py-0.5 text-xs disabled:bg-gray-100" title="Quota in MB" />
                      <span className="text-gray-400">MB</span>
                      <button onClick={()=>saveQuota(u)} className="rounded bg-gray-100 px-2 py-0.5 hover:bg-gray-200">Set</button>
                    </div>
                    <label className="mt-1 flex items-center gap-1 text-xs text-gray-500">
                      <input type="checkbox" checked={quotaUnlimited[u.id] ?? (u.storageLimitBytes == null)} onChange={e=>setQuotaUnlimited(prev=>({...prev,[u.id]:e.target.checked}))} /> Unlimited
                    </label>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={()=>toggleActive(u)} className={`rounded-full px-3 py-1 text-xs ${u.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>{u.isActive ? "Active" : "Disabled"}</button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      <button onClick={()=>openEditUser(u)} className="rounded-full bg-[#e8f0fe] px-3 py-1 text-xs text-[#1a73e8] hover:bg-[#d2e3fc]">Edit profile</button>
                      <button onClick={()=>resetPw(u)} className="rounded-full bg-gray-100 px-3 py-1 text-xs hover:bg-gray-200">Reset pw</button>
                      <button onClick={()=>removeUser(u)} className="rounded-full bg-red-50 px-3 py-1 text-xs text-red-600 hover:bg-red-100" disabled={u.id===session?.user.id}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </>
        )}

        {section === "departments" && (
        <div className="mb-6 rounded-xl bg-white p-4 shadow-sm">
          <h2 className="mb-1 text-sm font-semibold text-textC">Departments & Units ({departments.length})</h2>
          <p className="mb-3 text-xs text-gray-500">Type to search in every department input. Rename updates all members automatically. Deactivating hides it from registration. Deleting requires reassigning members first.</p>
          <div className="mb-4 flex gap-2">
            <input value={newDept} onChange={e=>setNewDept(e.target.value)} onKeyDown={e=>e.key==="Enter" && addDepartment()} placeholder="New department / unit name…" className="max-w-sm flex-1 rounded border px-3 py-2 text-sm outline-none focus:border-[#1a73e8]" />
            <button onClick={addDepartment} className="rounded-full bg-[#1a73e8] px-5 text-sm font-medium text-white hover:bg-[#1765cc]">Add</button>
          </div>
          {departments.length===0 ? (
            <p className="py-6 text-center text-sm text-gray-400">{loading ? "Loading…" : "No departments yet"}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b bg-gray-50 text-xs text-gray-500">
                  <tr>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Members</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Rename</th>
                    <th className="px-4 py-3">Delete / Reassign</th>
                  </tr>
                </thead>
                <tbody>
                  {departments.map(d => (
                    <tr key={d.id} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">{d.name}</td>
                      <td className="px-4 py-3 text-xs">{d.memberCount}</td>
                      <td className="px-4 py-3">
                        <button onClick={()=>toggleDepartment(d)} className={`rounded-full px-3 py-1 text-xs ${d.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>{d.isActive ? "Active" : "Inactive"}</button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <input value={deptRename[d.id] ?? d.name} onChange={e=>setDeptRename(prev=>({...prev,[d.id]:e.target.value}))} className="w-48 rounded border px-2 py-1 text-xs" />
                          <button onClick={()=>renameDepartment(d)} className="rounded bg-gray-100 px-2 py-1 text-xs hover:bg-gray-200">Save</button>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          {d.memberCount > 0 && (
                            <select value={deptReassign[d.id] ?? ""} onChange={e=>setDeptReassign(prev=>({...prev,[d.id]:e.target.value}))} className="max-w-[200px] rounded border px-2 py-1 text-xs" title="Reassign members to…">
                              <option value="">Reassign to…</option>
                              {departments.filter(x => x.id !== d.id).map(x => <option key={x.id} value={x.id}>{x.name}</option>)}
                            </select>
                          )}
                          <button onClick={()=>removeDepartment(d)} className="rounded-full bg-red-50 px-3 py-1 text-xs text-red-600 hover:bg-red-100">Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        )}

                <p className="mt-4 text-xs text-gray-400">Full admin = demo@local.dev + ADMIN role. New registrations stay pending until approved. Disabled users cannot login. Hard delete removes user + files permanently (CASCADE); soft disable keeps data.</p>
              </div>
            </div>
          </div>
        </div>
      </section>
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onMouseDown={e => { if (e.target === e.currentTarget) setEditingUser(null); }}>
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
            <h2 className="mb-1 text-base font-semibold text-textC">Edit profile</h2>
            <p className="mb-4 text-xs text-gray-500">{editingUser.email}</p>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500">Full name *</label>
                <input value={editName} onChange={e=>setEditName(e.target.value)} className="w-full rounded border px-3 py-2 text-sm outline-none focus:border-[#1a73e8]" />
              </div>
              <div>
                <label className="text-xs text-gray-500">IC number</label>
                <input value={editIc} onChange={e=>setEditIc(e.target.value)} placeholder="—" className="w-full rounded border px-3 py-2 text-sm outline-none focus:border-[#1a73e8]" />
              </div>
              <div>
                <label className="text-xs text-gray-500">Department (type to search)</label>
                <DepartmentCombobox value={editDept} onChange={setEditDept} options={deptOptions} placeholder="Type to search…" allowClear />
              </div>
              <div>
                <label className="text-xs text-gray-500">Profile / job title</label>
                <textarea value={editProfile} onChange={e=>setEditProfile(e.target.value)} placeholder="—" rows={3} className="w-full rounded border px-3 py-2 text-sm outline-none focus:border-[#1a73e8]" />
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={()=>setEditingUser(null)} className="rounded-full px-4 py-2 text-sm text-gray-600 hover:bg-gray-100">Cancel</button>
              <button onClick={saveEditUser} disabled={editSaving} className="rounded-full bg-[#1a73e8] px-6 py-2 text-sm font-medium text-white hover:bg-[#1765cc] disabled:opacity-50">
                {editSaving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
