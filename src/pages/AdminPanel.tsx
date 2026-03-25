import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Building2, Network, Settings, Shield, Trash2, UserPlus, Users } from "lucide-react";

import { API_BASE_URL, parseApiResponse } from "@/lib/api";
import { getAverageSecurity, getDepartmentAnalytics, getTopologies } from "@/utils/storage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/sonner";
import { User, useAuth } from "@/contexts/AuthContext";

type NewUserForm = {
  name: string;
  email: string;
  password: string;
  role: User["role"];
  department: string;
};

const initialForm: NewUserForm = {
  name: "",
  email: "",
  password: "",
  role: "viewer",
  department: "IT",
};

export default function AdminPanel() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [topologies, setTopologies] = useState<Awaited<ReturnType<typeof getTopologies>>>([]);
  const [form, setForm] = useState<NewUserForm>(initialForm);
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    const [usersResponse, topologiesResponse] = await Promise.all([
      fetch(`${API_BASE_URL}/users`).then((response) => parseApiResponse<User[]>(response)),
      getTopologies(),
    ]);

    setUsers(usersResponse);
    setTopologies(topologiesResponse);
  };

  useEffect(() => {
    void load().catch((error) => {
      console.error("Failed to load admin data", error);
    });
  }, []);

  const departments = useMemo(() => getDepartmentAnalytics(topologies), [topologies]);
  const avgSecurity = getAverageSecurity(topologies);

  const handleCreateUser = async () => {
    try {
      setSubmitting(true);
      await fetch(`${API_BASE_URL}/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      }).then((response) => parseApiResponse<User>(response));

      setForm(initialForm);
      await load();
      toast.success("User created successfully");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to create user");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUserUpdate = async (targetUser: User, patch: Partial<Pick<User, "role" | "department">>) => {
    try {
      await fetch(`${API_BASE_URL}/users/${targetUser.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: targetUser.name,
          department: patch.department ?? targetUser.department,
          role: patch.role ?? targetUser.role,
        }),
      }).then((response) => parseApiResponse<User>(response));

      await load();
      toast.success("User updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update user");
    }
  };

  const handleDeleteUser = async (targetUser: User) => {
    try {
      await fetch(`${API_BASE_URL}/users/${targetUser.id}`, {
        method: "DELETE",
      }).then((response) => parseApiResponse<{ success: boolean }>(response));

      await load();
      toast.success("User deleted");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to delete user");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Settings className="h-6 w-6 text-primary" /> Admin Panel
        </h1>
        <p className="text-muted-foreground text-sm mt-1">MongoDB-backed user management, roles, and system monitoring</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Users", value: users.length, icon: Users },
          { label: "Departments", value: departments.length, icon: Building2 },
          { label: "Total Topologies", value: topologies.length, icon: Network },
          { label: "Avg Security", value: avgSecurity, icon: Shield },
        ].map((item, index) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="glass-card p-4 text-center"
          >
            <item.icon className="mx-auto mb-2 h-5 w-5 text-primary" />
            <div className="text-2xl font-bold text-foreground">{item.value}</div>
            <div className="text-xs text-muted-foreground">{item.label}</div>
          </motion.div>
        ))}
      </div>

      <div className="glass-card p-6 space-y-4">
        <div className="flex items-center gap-2">
          <UserPlus className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Create Admin or Team User</h2>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
          <div>
            <Label>Name</Label>
            <Input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
          </div>
          <div>
            <Label>Email</Label>
            <Input value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
          </div>
          <div>
            <Label>Password</Label>
            <Input type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} />
          </div>
          <div>
            <Label>Role</Label>
            <select
              value={form.role}
              onChange={(event) => setForm({ ...form, role: event.target.value as User["role"] })}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="viewer">viewer</option>
              <option value="engineer">engineer</option>
              <option value="admin">admin</option>
            </select>
          </div>
          <div>
            <Label>Department</Label>
            <Input value={form.department} onChange={(event) => setForm({ ...form, department: event.target.value })} />
          </div>
        </div>
        <Button onClick={() => void handleCreateUser()} disabled={submitting || !form.name || !form.email || !form.password}>
          {submitting ? "Creating..." : "Create User"}
        </Button>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="border-b border-border/50 p-4">
          <h2 className="font-semibold text-foreground flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" /> All Users
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/30 text-muted-foreground text-xs">
                <th className="text-left p-3">Name</th>
                <th className="text-left p-3">Email</th>
                <th className="text-left p-3">Role</th>
                <th className="text-left p-3">Department</th>
                <th className="text-left p-3">Topologies</th>
                <th className="text-left p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b border-border/20 hover:bg-muted/20 transition-colors">
                  <td className="p-3 font-medium text-foreground">
                    <div className="flex items-center gap-2">
                      <span>{user.name}</span>
                      {user.role === "admin" && (
                        <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-primary">
                          Admin
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="p-3 text-muted-foreground font-mono text-xs">{user.email}</td>
                  <td className="p-3">
                    <select
                      value={user.role}
                      onChange={(event) => void handleUserUpdate(user, { role: event.target.value as User["role"] })}
                      className="rounded-md border border-input bg-background px-2 py-1 text-xs"
                    >
                      <option value="viewer">viewer</option>
                      <option value="engineer">engineer</option>
                      <option value="admin">admin</option>
                    </select>
                  </td>
                  <td className="p-3">
                    <Input
                      value={user.department}
                      onChange={(event) => {
                        setUsers((current) =>
                          current.map((item) => item.id === user.id ? { ...item, department: event.target.value } : item),
                        );
                      }}
                      onBlur={(event) => void handleUserUpdate({ ...user, department: event.target.value }, { department: event.target.value })}
                      className="h-8 bg-transparent"
                    />
                  </td>
                  <td className="p-3 text-muted-foreground">{user.topologiesCreated}</td>
                  <td className="p-3">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0 text-destructive"
                      disabled={currentUser?.id === user.id}
                      onClick={() => void handleDeleteUser(user)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-muted-foreground">
                    No MongoDB user records found yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
