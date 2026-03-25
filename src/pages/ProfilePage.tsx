import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { BadgeCheck, Building2, Clock, Key, Mail, Network, Trash2, User } from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/sonner";

export default function ProfilePage() {
  const { user, updatePassword, updateProfile } = useAuth();
  const [name, setName] = useState(user?.name ?? "");
  const [department, setDepartment] = useState(user?.department ?? "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    setName(user?.name ?? "");
    setDepartment(user?.department ?? "");
  }, [user]);

  if (!user) return null;

  const handleSaveProfile = async () => {
    try {
      setSavingProfile(true);
      await updateProfile({ name, department });
      toast.success("Profile updated in MongoDB");
    } catch (issue) {
      toast.error(issue instanceof Error ? issue.message : "Unable to update profile");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    try {
      setSavingPassword(true);
      await updatePassword(currentPassword, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      toast.success("Password updated");
    } catch (issue) {
      toast.error(issue instanceof Error ? issue.message : "Unable to update password");
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <User className="h-6 w-6 text-primary" /> Profile
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Manage your MongoDB-backed account settings</p>
      </div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6">
        <div className="flex items-center gap-6 mb-6">
          <div className="w-20 h-20 rounded-full bg-primary/10 border-2 border-primary/30 flex items-center justify-center text-2xl font-bold text-primary">
            {user.name.split(" ").map((part) => part[0]).join("")}
          </div>
          <div>
            <h2 className="text-xl font-semibold text-foreground">{user.name}</h2>
            <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground capitalize">
              <span>{user.role} - {user.department}</span>
              {user.role === "admin" && (
                <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[11px] uppercase tracking-[0.16em] text-primary">
                  <BadgeCheck className="h-3 w-3" />
                  Admin Access
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">User ID: {user.id}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs flex items-center gap-1"><User className="h-3 w-3" /> Full Name</Label>
            <Input value={name} onChange={(event) => setName(event.target.value)} className="bg-muted/50 border-border" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs flex items-center gap-1"><Mail className="h-3 w-3" /> Email</Label>
            <Input value={user.email} className="bg-muted/50 border-border" readOnly />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs flex items-center gap-1"><User className="h-3 w-3" /> Role</Label>
            <Input value={user.role} className="bg-muted/50 border-border capitalize" readOnly />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs flex items-center gap-1"><Building2 className="h-3 w-3" /> Department</Label>
            <Input value={department} onChange={(event) => setDepartment(event.target.value)} className="bg-muted/50 border-border" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs flex items-center gap-1"><Clock className="h-3 w-3" /> Last Login</Label>
            <Input value={new Date(user.lastLogin).toLocaleString()} className="bg-muted/50 border-border" readOnly />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs flex items-center gap-1"><Network className="h-3 w-3" /> Topologies Created</Label>
            <Input value={String(user.topologiesCreated)} className="bg-muted/50 border-border" readOnly />
          </div>
        </div>

        <Button onClick={() => void handleSaveProfile()} disabled={savingProfile} className="mt-4 bg-primary text-primary-foreground hover:bg-primary/90">
          {savingProfile ? "Saving..." : "Save Changes"}
        </Button>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-6">
        <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2"><Key className="h-4 w-4 text-primary" /> Change Password</h2>
        <div className="space-y-3 max-w-sm">
          <div className="space-y-1.5">
            <Label className="text-xs">Current Password</Label>
            <Input type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} placeholder="Current password" className="bg-muted/50 border-border" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">New Password</Label>
            <Input type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} placeholder="New password" className="bg-muted/50 border-border" />
          </div>
          <Button variant="outline" onClick={() => void handleChangePassword()} disabled={savingPassword || !currentPassword || !newPassword}>
            {savingPassword ? "Updating..." : "Update Password"}
          </Button>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card p-6 border-destructive/20">
        <h2 className="font-semibold text-destructive mb-2 flex items-center gap-2"><Trash2 className="h-4 w-4" /> Danger Zone</h2>
        <p className="text-sm text-muted-foreground mb-3">Account deletion is not wired yet, but the rest of your profile data is now stored in MongoDB.</p>
        <Button variant="outline" className="text-destructive border-destructive/30 hover:bg-destructive/10">Delete Account</Button>
      </motion.div>
    </div>
  );
}
