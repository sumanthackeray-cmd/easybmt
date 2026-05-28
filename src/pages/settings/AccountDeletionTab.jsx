import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Trash2, ShieldAlert } from "lucide-react";
import { toast } from "@/lib/toast";
import { auth } from "@/api/firebase";
import { deleteUser } from "firebase/auth";
import { base44 } from "@/api/base44Client";

export default function AccountDeletionTab() {
  const { user, logout } = useAuth();
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleDeleteAccount = async () => {
    if (!auth.currentUser) return;
    setIsDeleting(true);
    try {
      // If we have an employee record, try deleting that too (this might fail if permissions don't allow it, but we try)
      if (user?.id) {
        try {
          await base44.entities.Employee.delete(user.id);
        } catch (e) {
          console.warn("Could not delete Employee record", e);
        }
      }

      await deleteUser(auth.currentUser);
      toast.success("Account successfully deleted.");
      await logout();
    } catch (error) {
      console.error("Account deletion failed:", error);
      if (error.code === 'auth/requires-recent-login') {
        toast.error("Please log out and log in again before deleting your account for security reasons.");
      } else {
        toast.error("Failed to delete account. Please contact support.");
      }
    } finally {
      setIsDeleting(false);
      setShowConfirm(false);
    }
  };

  return (
    <div className="bg-card border border-border rounded-xl p-5 space-y-6">
      <div>
        <h3 className="text-lg font-bold flex items-center gap-2 text-red-600 dark:text-red-500">
          <ShieldAlert className="w-5 h-5" />
          Danger Zone
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          Once you delete your account, there is no going back. Please be certain.
        </p>
      </div>

      <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 rounded-xl p-5">
        <h4 className="font-bold text-red-800 dark:text-red-400 mb-2">Delete Account</h4>
        <p className="text-sm text-red-700 dark:text-red-300 mb-4">
          Deleting your account will permanently remove your login credentials, personal profile, and associated settings from our system. 
          If you are the owner of a company, we recommend transferring ownership before taking this action.
        </p>

        {!showConfirm ? (
          <Button 
            onClick={() => setShowConfirm(true)}
            variant="destructive" 
            className="font-bold shadow-sm hover:shadow-md"
          >
            <Trash2 className="w-4 h-4 mr-2" /> Delete My Account
          </Button>
        ) : (
          <div className="bg-white dark:bg-black/40 border border-red-300 dark:border-red-800 p-4 rounded-lg space-y-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <h5 className="font-bold text-red-700 dark:text-red-400">Are you absolutely sure?</h5>
                <p className="text-xs text-muted-foreground mt-1">
                  This action cannot be undone. All your personal data will be wiped.
                </p>
              </div>
            </div>
            
            <div className="flex gap-3">
              <Button 
                onClick={handleDeleteAccount} 
                variant="destructive" 
                disabled={isDeleting}
                className="font-bold"
              >
                {isDeleting ? "Deleting..." : "Yes, Delete Account"}
              </Button>
              <Button 
                onClick={() => setShowConfirm(false)} 
                variant="outline" 
                disabled={isDeleting}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
