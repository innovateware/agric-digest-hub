import { useAuthActions } from "@convex-dev/auth/react";
import { Button } from "@/components/ui/button";
import GoogleIcon from "@/components/GoogleIcon";
import { googleAuthEnabled } from "@/lib/authConfig";

export default function GoogleSignInSection({ onError }) {
  const { signIn } = useAuthActions();

  if (!googleAuthEnabled) {
    return null;
  }

  const handleGoogle = async () => {
    try {
      await signIn("google", { redirectTo: window.location.origin + "/" });
    } catch (err) {
      onError?.(err.message || "Google sign-in failed");
    }
  };

  return (
    <>
      <Button
        variant="outline"
        className="w-full h-12 text-sm font-medium mb-6"
        onClick={handleGoogle}
        type="button"
      >
        <GoogleIcon className="w-5 h-5 mr-2" />
        Continue with Google
      </Button>

      <div className="relative mb-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card px-3 text-muted-foreground">or</span>
        </div>
      </div>
    </>
  );
}
