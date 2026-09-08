"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { Plus, UserPlus, Ban, RotateCcw, X, Dices } from "lucide-react";
import {
  createStaffAction,
  assignRoleToStaffAction,
  revokeStaffRoleAction,
  deactivateStaffAction,
  reactivateStaffAction,
} from "@/modules/users/actions/staff.actions";

interface RoleAssignment {
  userRoleId: string;
  roleName: string;
  branchName: string | null;
}

interface StaffRow {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  status: "ACTIVE" | "INVITED" | "SUSPENDED" | "DEACTIVATED";
  roles: RoleAssignment[];
}

interface RoleOption {
  id: string;
  name: string;
}

interface BranchOption {
  id: string;
  name: string;
}

const inputClass =
  "w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 outline-none focus:border-brand-red dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100";

function formatRoleLabel(name: string): string {
  return name
    .split("_")
    .map((word) => word[0] + word.slice(1).toLowerCase())
    .join(" ");
}

function generatePassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%";
  let out = "";
  for (let i = 0; i < 12; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

function RoleBranchFields({
  roles,
  branches,
  roleId,
  setRoleId,
  branchId,
  setBranchId,
}: {
  roles: RoleOption[];
  branches: BranchOption[];
  roleId: string;
  setRoleId: (v: string) => void;
  branchId: string;
  setBranchId: (v: string) => void;
}) {
  return (
    <>
      <div>
        <label className="text-xs font-medium text-stone-500 dark:text-stone-400">Role</label>
        <select value={roleId} onChange={(e) => setRoleId(e.target.value)} className={`mt-1 ${inputClass}`}>
          {roles.map((r) => (
            <option key={r.id} value={r.id}>
              {formatRoleLabel(r.name)}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="text-xs font-medium text-stone-500 dark:text-stone-400">Branch</label>
        <select value={branchId} onChange={(e) => setBranchId(e.target.value)} className={`mt-1 ${inputClass}`}>
          <option value="">All branches</option>
          {branches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </div>
    </>
  );
}

function CreateStaffModal({
  roles,
  branches,
  onClose,
  onSaved,
}: {
  roles: RoleOption[];
  branches: BranchOption[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [roleId, setRoleId] = useState(roles[0]?.id ?? "");
  const [branchId, setBranchId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit() {
    if (!firstName.trim() || !lastName.trim() || !roleId) {
      setError("First name, last name, and role are required.");
      return;
    }
    if (!email.trim() && !phone.trim()) {
      setError("Provide an email or a phone number to sign in with.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        await createStaffAction({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim() || undefined,
          phone: phone.trim() || undefined,
          password,
          roleId,
          branchId: branchId || null,
        });
        onSaved();
        onClose();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Couldn't create the account.");
      }
    });
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: 0.97 }}
        transition={{ duration: 0.18 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl border border-stone-200 bg-white p-5 shadow-2xl dark:border-stone-800 dark:bg-stone-900"
      >
        <h3 className="font-display text-lg uppercase tracking-tight text-stone-900 dark:text-stone-50">New staff account</h3>
        {error && <p className="mt-2 rounded-lg bg-red-50 px-3 py-1.5 text-xs text-red-700 dark:bg-red-950/40 dark:text-red-300">{error}</p>}
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-stone-500 dark:text-stone-400">First name</label>
            <input value={firstName} onChange={(e) => setFirstName(e.target.value)} className={`mt-1 ${inputClass}`} />
          </div>
          <div>
            <label className="text-xs font-medium text-stone-500 dark:text-stone-400">Last name</label>
            <input value={lastName} onChange={(e) => setLastName(e.target.value)} className={`mt-1 ${inputClass}`} />
          </div>
          <div>
            <label className="text-xs font-medium text-stone-500 dark:text-stone-400">Email (optional)</label>
            <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" className={`mt-1 ${inputClass}`} />
          </div>
          <div>
            <label className="text-xs font-medium text-stone-500 dark:text-stone-400">Phone (optional)</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} className={`mt-1 ${inputClass}`} />
          </div>
          <RoleBranchFields roles={roles} branches={branches} roleId={roleId} setRoleId={setRoleId} branchId={branchId} setBranchId={setBranchId} />
          <div className="col-span-2">
            <label className="text-xs font-medium text-stone-500 dark:text-stone-400">Temporary password</label>
            <div className="mt-1 flex gap-2">
              <input value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} placeholder="At least 8 characters" />
              <button
                type="button"
                onClick={() => setPassword(generatePassword())}
                title="Generate a password"
                className="flex shrink-0 items-center gap-1.5 rounded-lg border border-stone-300 px-3 text-xs font-medium text-stone-600 hover:bg-stone-100 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800"
              >
                <Dices size={13} /> Generate
              </button>
            </div>
            <p className="mt-1 text-[11px] text-stone-500 dark:text-stone-400">
              Share this with them directly — they can change it from My Account after signing in.
            </p>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg px-3.5 py-2 text-sm font-medium text-stone-600 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800">
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={isPending}
            className="rounded-lg bg-brand-red px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-brand-red/20 transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
          >
            {isPending ? "Creating…" : "Create account"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function AssignRoleModal({
  staff,
  roles,
  branches,
  onClose,
  onSaved,
}: {
  staff: StaffRow;
  roles: RoleOption[];
  branches: BranchOption[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [roleId, setRoleId] = useState(roles[0]?.id ?? "");
  const [branchId, setBranchId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit() {
    if (!roleId) {
      setError("Choose a role.");
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        await assignRoleToStaffAction({ userId: staff.id, roleId, branchId: branchId || null });
        onSaved();
        onClose();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Couldn't assign the role.");
      }
    });
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: 0.97 }}
        transition={{ duration: 0.18 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-2xl border border-stone-200 bg-white p-5 shadow-2xl dark:border-stone-800 dark:bg-stone-900"
      >
        <h3 className="font-display text-lg uppercase tracking-tight text-stone-900 dark:text-stone-50">
          Add a role for {staff.firstName}
        </h3>
        {error && <p className="mt-2 rounded-lg bg-red-50 px-3 py-1.5 text-xs text-red-700 dark:bg-red-950/40 dark:text-red-300">{error}</p>}
        <div className="mt-4 space-y-3">
          <RoleBranchFields roles={roles} branches={branches} roleId={roleId} setRoleId={setRoleId} branchId={branchId} setBranchId={setBranchId} />
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg px-3.5 py-2 text-sm font-medium text-stone-600 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800">
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={isPending}
            className="rounded-lg bg-brand-red px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-brand-red/20 transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
          >
            {isPending ? "Adding…" : "Add role"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

const STATUS_STYLES: Record<StaffRow["status"], string> = {
  ACTIVE: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  INVITED: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
  SUSPENDED: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  DEACTIVATED: "bg-stone-200 text-stone-500 dark:bg-stone-800 dark:text-stone-500",
};

export function StaffManager({
  staff,
  roles,
  branches,
  canCreate,
  canUpdate,
  canDeactivate,
}: {
  staff: StaffRow[];
  roles: RoleOption[];
  branches: BranchOption[];
  canCreate: boolean;
  canUpdate: boolean;
  canDeactivate: boolean;
}) {
  const [createOpen, setCreateOpen] = useState(false);
  const [roleModalFor, setRoleModalFor] = useState<StaffRow | null>(null);
  const [, startTransition] = useTransition();
  const router = useRouter();

  return (
    <>
      <section className="rounded-xl border border-stone-200/70 bg-white shadow-sm shadow-stone-900/5 transition-shadow duration-200 hover:shadow-md dark:border-stone-800 dark:bg-stone-900">
        <div className="flex items-center justify-between px-6 pt-6">
          <h2 className="font-display text-sm uppercase tracking-wide text-stone-500 dark:text-stone-400">
            Staff accounts ({staff.length})
          </h2>
          {canCreate && (
            <button
              onClick={() => setCreateOpen(true)}
              className="flex items-center gap-1.5 rounded-lg bg-brand-red px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-transform hover:scale-[1.03] active:scale-[0.97]"
            >
              <UserPlus size={13} /> New staff
            </button>
          )}
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-t border-stone-100 text-stone-500 dark:border-stone-800 dark:text-stone-400">
              <tr>
                <th className="px-6 py-2 font-medium">Name</th>
                <th className="px-6 py-2 font-medium">Contact</th>
                <th className="px-6 py-2 font-medium">Roles &amp; branches</th>
                <th className="px-6 py-2 font-medium">Status</th>
                <th className="px-6 py-2 font-medium">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
              {staff.map((person, index) => (
                <motion.tr key={person.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.02 }}>
                  <td className="px-6 py-3 font-medium text-stone-900 dark:text-stone-50">
                    {person.firstName} {person.lastName}
                  </td>
                  <td className="px-6 py-3 text-stone-600 dark:text-stone-400">{person.email ?? person.phone ?? "N/A"}</td>
                  <td className="px-6 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      {person.roles.map((r) => (
                        <span
                          key={r.userRoleId}
                          className="group flex items-center gap-1 rounded-full bg-brand-red-100 px-2.5 py-0.5 text-xs font-medium text-brand-red-800 dark:bg-brand-red-950 dark:text-brand-red-300"
                        >
                          {formatRoleLabel(r.roleName)}
                          {r.branchName ? ` · ${r.branchName}` : " · All branches"}
                          {canUpdate && (
                            <button
                              onClick={() =>
                                startTransition(async () => {
                                  await revokeStaffRoleAction(r.userRoleId);
                                  router.refresh();
                                })
                              }
                              title="Remove this role"
                              className="ml-0.5 opacity-0 transition-opacity group-hover:opacity-70 hover:!opacity-100"
                            >
                              <X size={11} />
                            </button>
                          )}
                        </span>
                      ))}
                      {person.roles.length === 0 && <span className="text-xs text-stone-400">No roles assigned</span>}
                      {canUpdate && (
                        <button
                          onClick={() => setRoleModalFor(person)}
                          title="Add a role"
                          className="flex size-5 items-center justify-center rounded-full border border-dashed border-stone-300 text-stone-400 hover:border-brand-red hover:text-brand-red dark:border-stone-700"
                        >
                          <Plus size={11} />
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLES[person.status]}`}>{person.status}</span>
                  </td>
                  <td className="px-6 py-3 text-right">
                    {canDeactivate && person.status !== "DEACTIVATED" && (
                      <button
                        onClick={() =>
                          startTransition(async () => {
                            await deactivateStaffAction(person.id);
                            router.refresh();
                          })
                        }
                        title="Deactivate"
                        className="inline-flex size-7 items-center justify-center rounded-lg text-stone-500 hover:bg-red-50 hover:text-red-600 dark:text-stone-400 dark:hover:bg-red-950/40"
                      >
                        <Ban size={13} />
                      </button>
                    )}
                    {canUpdate && person.status === "DEACTIVATED" && (
                      <button
                        onClick={() =>
                          startTransition(async () => {
                            await reactivateStaffAction(person.id);
                            router.refresh();
                          })
                        }
                        title="Reactivate"
                        className="inline-flex size-7 items-center justify-center rounded-lg text-stone-500 hover:bg-emerald-50 hover:text-emerald-600 dark:text-stone-400 dark:hover:bg-emerald-950/40"
                      >
                        <RotateCcw size={13} />
                      </button>
                    )}
                  </td>
                </motion.tr>
              ))}
              {staff.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-6 text-center text-sm text-stone-500 dark:text-stone-400">
                    No staff accounts yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="h-6" />
      </section>

      <AnimatePresence>
        {createOpen && <CreateStaffModal roles={roles} branches={branches} onClose={() => setCreateOpen(false)} onSaved={() => router.refresh()} />}
        {roleModalFor && (
          <AssignRoleModal
            staff={roleModalFor}
            roles={roles}
            branches={branches}
            onClose={() => setRoleModalFor(null)}
            onSaved={() => router.refresh()}
          />
        )}
      </AnimatePresence>
    </>
  );
}
