import React, { createContext, useContext, useEffect } from "react";
import { useConvexAuth } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const { isLoading, isAuthenticated } = useConvexAuth();
  const { signOut } = useAuthActions();
  const user = useQuery(api.users.currentUser);
  const ensureProfile = useMutation(api.users.ensureProfile);

  useEffect(() => {
    if (isAuthenticated) {
      ensureProfile({}).catch(console.error);
    }
  }, [isAuthenticated, ensureProfile]);

  const logout = async (redirectTo = "/login") => {
    await signOut();
    if (redirectTo) {
      window.location.href = redirectTo;
    }
  };

  const navigateToLogin = () => {
    window.location.href = "/login";
  };

  const checkUserAuth = async () => {
    // Convex auth state is reactive; no manual refresh needed.
  };

  const checkAppState = async () => {
    // Legacy Base44 app-state check removed.
  };

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isAuthenticated: isAuthenticated && !!user,
        isLoadingAuth: isLoading || (isAuthenticated && user === undefined),
        isLoadingPublicSettings: false,
        authError: null,
        appPublicSettings: null,
        authChecked: !isLoading,
        logout,
        navigateToLogin,
        checkUserAuth,
        checkAppState,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
