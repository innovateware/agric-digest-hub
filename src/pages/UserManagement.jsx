import React, { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useAuth } from "@/lib/AuthContext";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { 
  Users, UserPlus, ShieldAlert, KeyRound, Trash2, 
  Loader2, Mail, User, Shield, AlertTriangle 
} from "lucide-react";

const ROLE_COLORS = {
  admin: "bg-red-500/10 text-red-500 border-red-500/20",
  data_entry: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  viewer: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
};

export default function UserManagement() {
  const { user: currentUser } = useAuth();
  
  // Queries & Mutations
  const users = useQuery(api.users.listProfiles);
  const createUserMutation = useMutation(api.users.createUser);
  const changePasswordMutation = useMutation(api.users.changeUserPassword);
  const deleteUserMutation = useMutation(api.users.removeUser);
  const updateRoleMutation = useMutation(api.users.updateRole);

  // Modals state
  const [createOpen, setCreateOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  // Form states
  const [createForm, setCreateForm] = useState({ name: "", email: "", password: "", role: "viewer" });
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // Access check
  if (currentUser?.role !== "admin") {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center p-8 max-w-md bg-card border rounded-2xl shadow-xl backdrop-blur-md">
          <ShieldAlert className="w-16 h-16 text-destructive mx-auto mb-4 animate-bounce" />
          <h2 className="text-2xl font-bold font-heading mb-2">Access Denied</h2>
          <p className="text-muted-foreground mb-6">
            You do not have the required permissions to access the User Management panel. This area is restricted to system administrators.
          </p>
        </div>
      </div>
    );
  }

  // Handlers
  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (createForm.password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    setLoading(true);
    try {
      await createUserMutation({
        email: createForm.email,
        password: createForm.password,
        role: createForm.role,
        name: createForm.name || undefined,
      });
      toast.success(`User "${createForm.email}" created successfully`);
      setCreateOpen(false);
      setCreateForm({ name: "", email: "", password: "", role: "viewer" });
    } catch (err) {
      toast.error(err.message || "Failed to create user");
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    setLoading(true);
    try {
      await changePasswordMutation({
        userId: selectedUser.id,
        newPassword,
      });
      toast.success(`Password for ${selectedUser.email} updated successfully`);
      setPasswordOpen(false);
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      toast.error(err.message || "Failed to change password");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    setLoading(true);
    try {
      await deleteUserMutation({ userId: selectedUser.id });
      toast.success("User account deleted successfully");
      setDeleteOpen(false);
    } catch (err) {
      toast.error(err.message || "Failed to delete user");
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      await updateRoleMutation({ userId, role: newRole });
      toast.success("User privilege level updated successfully");
    } catch (err) {
      toast.error(err.message || "Failed to update role");
    }
  };

  const isLoadingUsers = users === undefined;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-heading tracking-tight flex items-center gap-3">
            <Users className="w-8 h-8 text-primary" />
            User Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Create system accounts, manage passwords, and configure privilege roles.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="gap-2 self-start sm:self-auto h-11 px-5 font-semibold">
          <UserPlus className="w-4 h-4" /> Create User
        </Button>
      </div>

      <Card className="border shadow-lg rounded-2xl overflow-hidden bg-card/50 backdrop-blur-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40 border-b">
              <TableHead className="font-semibold text-xs py-4">User</TableHead>
              <TableHead className="font-semibold text-xs py-4">Email Address</TableHead>
              <TableHead className="font-semibold text-xs py-4">Privilege Level</TableHead>
              <TableHead className="font-semibold text-xs py-4 text-right pr-6">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoadingUsers ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-16 text-muted-foreground">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-primary" />
                  Retrieving system user list...
                </TableCell>
              </TableRow>
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-16">
                  <Users className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-muted-foreground font-medium">No users found</p>
                </TableCell>
              </TableRow>
            ) : (
              users.map((profile) => (
                <TableRow key={profile.id} className="border-b transition-colors hover:bg-muted/20">
                  <TableCell className="py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                        {profile.name?.[0]?.toUpperCase() || profile.email[0]?.toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-sm">{profile.name || "Anonymous User"}</p>
                        {profile.id === currentUser.id && (
                          <span className="text-[10px] font-bold text-primary/70 bg-primary/5 px-2 py-0.5 rounded-full border border-primary/10">You</span>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="py-4 text-sm font-mono text-muted-foreground">
                    {profile.email}
                  </TableCell>
                  <TableCell className="py-4">
                    {profile.id === currentUser.id ? (
                      <Badge variant="outline" className={`capitalize font-semibold text-[11px] px-2.5 py-1 ${ROLE_COLORS[profile.role]}`}>
                        {profile.role.replace("_", " ")}
                      </Badge>
                    ) : (
                      <select
                        value={profile.role}
                        onChange={(e) => handleRoleChange(profile.id, e.target.value)}
                        className="bg-transparent text-xs font-semibold rounded-lg border px-2.5 py-1 focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer capitalize shadow-sm border-input"
                      >
                        <option value="viewer">User (Viewer)</option>
                        <option value="data_entry">User (Data Entry)</option>
                        <option value="admin">Admin</option>
                      </select>
                    )}
                  </TableCell>
                  <TableCell className="py-4 text-right pr-6 space-x-1.5">
                    {profile.id !== currentUser.id ? (
                      <>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => {
                            setSelectedUser(profile);
                            setPasswordOpen(true);
                          }}
                          className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/5 rounded-lg"
                          title="Change Password"
                        >
                          <KeyRound className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => {
                            setSelectedUser(profile);
                            setDeleteOpen(true);
                          }}
                          className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/5 rounded-lg"
                          title="Delete User"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </>
                    ) : (
                      <span className="text-xs text-muted-foreground italic pr-2">Self</span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* CREATE USER DIALOG */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-primary" />
              Create New User
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateUser} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="create-name" className="text-xs font-semibold">Full Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  id="create-name"
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  placeholder="John Doe"
                  className="pl-10 h-10 rounded-xl"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="create-email" className="text-xs font-semibold">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  id="create-email"
                  type="email"
                  required
                  value={createForm.email}
                  onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                  placeholder="user@example.com"
                  className="pl-10 h-10 rounded-xl"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="create-password" className="text-xs font-semibold">Temporary Password</Label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  id="create-password"
                  type="password"
                  required
                  value={createForm.password}
                  onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                  placeholder="••••••••"
                  className="pl-10 h-10 rounded-xl"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="create-role" className="text-xs font-semibold">Privilege Level</Label>
              <div className="relative">
                <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <select
                  id="create-role"
                  value={createForm.role}
                  onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })}
                  className="flex h-10 w-full rounded-xl border border-input bg-background pl-10 pr-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 cursor-pointer shadow-sm"
                >
                  <option value="viewer">User (Viewer)</option>
                  <option value="data_entry">User (Data Entry)</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)} className="rounded-xl">Cancel</Button>
              <Button type="submit" disabled={loading} className="rounded-xl gap-2">
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                Create User
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* CHANGE PASSWORD DIALOG */}
      <Dialog open={passwordOpen} onOpenChange={setPasswordOpen}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-primary" />
              Reset Password
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleChangePassword} className="space-y-4 pt-2">
            <p className="text-xs text-muted-foreground">
              Reset temporary password for <strong className="font-semibold">{selectedUser?.email}</strong>.
            </p>

            <div className="space-y-1.5">
              <Label htmlFor="new-password" className="text-xs font-semibold">New Password</Label>
              <Input 
                id="new-password"
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="h-10 rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirm-password" className="text-xs font-semibold">Confirm Password</Label>
              <Input 
                id="confirm-password"
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="h-10 rounded-xl"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setPasswordOpen(false)} className="rounded-xl">Cancel</Button>
              <Button type="submit" disabled={loading} className="rounded-xl gap-2">
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                Save Password
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DELETE CONFIRMATION DIALOG */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              Delete Account
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to permanently delete the account <strong className="font-semibold text-foreground">{selectedUser?.email}</strong>?
            </p>
            <p className="text-xs text-destructive bg-destructive/10 p-3 rounded-lg border border-destructive/20 font-medium">
              Warning: This action is irreversible. All profile data, account linkages, and sessions will be destroyed.
            </p>
          </div>
          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => setDeleteOpen(false)} className="rounded-xl">Cancel</Button>
            <Button type="button" variant="destructive" onClick={handleDeleteUser} disabled={loading} className="rounded-xl gap-2">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Delete Account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
