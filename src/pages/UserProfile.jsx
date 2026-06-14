import React, { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useAuth } from "@/lib/AuthContext";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { 
  User, Mail, Shield, Loader2, Lock, 
  CheckCircle2, AlertCircle, Key
} from "lucide-react";

export default function UserProfile() {
  const { user } = useAuth();
  
  // Queries & Mutations
  const providers = useQuery(api.users.getMyProviders);
  const updateProfileMutation = useMutation(api.users.updateProfile);
  const changePasswordMutation = useMutation(api.users.changeOwnPassword);

  // Form states
  const [name, setName] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [loadingPassword, setLoadingPassword] = useState(false);

  useEffect(() => {
    if (user?.full_name) {
      setName(user.full_name);
    }
  }, [user]);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Name cannot be empty");
      return;
    }
    setLoadingProfile(true);
    try {
      await updateProfileMutation({ name });
      toast.success("Profile updated successfully. Refreshing...");
      // Refresh window to reload user context from AuthProvider if needed (or let React handle state)
      setTimeout(() => window.location.reload(), 1000);
    } catch (err) {
      toast.error(err.message || "Failed to update profile");
    } finally {
      setLoadingProfile(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }
    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    setLoadingPassword(true);
    try {
      await changePasswordMutation({
        currentPassword,
        newPassword,
      });
      toast.success("Password changed successfully");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      toast.error(err.message || "Failed to change password");
    } finally {
      setLoadingPassword(false);
    }
  };

  const hasPasswordProvider = providers?.includes("password");
  const isGoogleProvider = providers?.includes("google");

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold font-heading tracking-tight flex items-center gap-3">
          <User className="w-8 h-8 text-primary" />
          My Profile
        </h1>
        <p className="text-muted-foreground mt-1">
          Manage your personal details, secure your account, and view privileges.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Side: Avatar Card */}
        <Card className="md:col-span-1 border shadow-lg rounded-2xl bg-card/50 backdrop-blur-sm h-fit">
          <CardContent className="pt-8 pb-6 text-center space-y-4">
            <div className="w-24 h-24 rounded-2xl bg-primary/10 mx-auto flex items-center justify-center border border-primary/20 shadow-inner">
              <span className="text-4xl font-extrabold text-primary">
                {user?.full_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase()}
              </span>
            </div>
            <div>
              <h2 className="text-xl font-bold font-heading">{user?.full_name || "User"}</h2>
              <p className="text-sm font-mono text-muted-foreground break-all">{user?.email}</p>
            </div>
            
            <div className="pt-2 border-t flex flex-col items-center gap-2">
              <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Role / Privilege Level</span>
              <div className="flex items-center gap-2 bg-primary/5 border border-primary/10 px-3 py-1 rounded-xl">
                <Shield className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs font-bold capitalize text-primary">
                  {user?.role?.replace("_", " ")}
                </span>
              </div>
            </div>

            <div className="pt-2 border-t flex flex-col items-center gap-2">
              <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Linked Providers</span>
              <div className="flex flex-wrap gap-1 justify-center">
                {providers === undefined ? (
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                ) : (
                  providers.map((p) => (
                    <span 
                      key={p} 
                      className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-muted capitalize"
                    >
                      {p}
                    </span>
                  ))
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Right Side: Tabbed Interface */}
        <Card className="md:col-span-2 border shadow-lg rounded-2xl bg-card/50 backdrop-blur-sm">
          <Tabs defaultValue="details" className="w-full">
            <CardHeader className="border-b pb-0">
              <TabsList className="bg-transparent gap-6 p-0 h-10 w-fit">
                <TabsTrigger 
                  value="details" 
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-1 pb-3 text-sm font-semibold shadow-none cursor-pointer"
                >
                  Profile Information
                </TabsTrigger>
                <TabsTrigger 
                  value="security" 
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-1 pb-3 text-sm font-semibold shadow-none cursor-pointer"
                >
                  Security & Password
                </TabsTrigger>
              </TabsList>
            </CardHeader>

            <TabsContent value="details" className="m-0 p-6 space-y-4">
              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="profile-name" className="text-xs font-semibold">Display Name</Label>
                  <Input 
                    id="profile-name"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your full name"
                    className="h-11 rounded-xl"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Email Address (Read-only)</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
                    <Input 
                      value={user?.email || ""} 
                      disabled 
                      readOnly 
                      className="h-11 rounded-xl pl-10 bg-muted/50 text-muted-foreground font-mono"
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    To modify your registered email address, please contact a system administrator.
                  </p>
                </div>

                <Button type="submit" disabled={loadingProfile} className="rounded-xl gap-2 font-semibold">
                  {loadingProfile && <Loader2 className="w-4 h-4 animate-spin" />}
                  Update Profile Details
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="security" className="m-0 p-6 space-y-4">
              {providers === undefined ? (
                <div className="text-center py-10">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
                </div>
              ) : hasPasswordProvider ? (
                <form onSubmit={handleChangePassword} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="current-password" className="text-xs font-semibold">Current Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input 
                        id="current-password"
                        type="password"
                        required
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="••••••••"
                        className="pl-10 h-11 rounded-xl"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="new-password" className="text-xs font-semibold">New Password</Label>
                    <div className="relative">
                      <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input 
                        id="new-password"
                        type="password"
                        required
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="••••••••"
                        className="pl-10 h-11 rounded-xl"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="confirm-password" className="text-xs font-semibold">Confirm New Password</Label>
                    <div className="relative">
                      <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input 
                        id="confirm-password"
                        type="password"
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className="pl-10 h-11 rounded-xl"
                      />
                    </div>
                  </div>

                  <Button type="submit" disabled={loadingPassword} className="rounded-xl gap-2 font-semibold">
                    {loadingPassword && <Loader2 className="w-4 h-4 animate-spin" />}
                    Update Account Password
                  </Button>
                </form>
              ) : isGoogleProvider ? (
                <div className="p-4 rounded-xl border border-blue-500/10 bg-blue-500/5 text-blue-500 flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-sm">Google Authentication Active</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      You are signed in via your Google Account. Your credentials and passwords are securely managed by Google. Local password management is disabled for this account.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl border border-amber-500/10 bg-amber-500/5 text-amber-500 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-sm">No Local Password Found</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      This account is authenticated through a third-party single sign-on provider. Passwords cannot be set or modified locally.
                    </p>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
}
