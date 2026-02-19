"use client";

import { useEffect, useState } from "react";
import { LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { useUser } from "@/context/user-context";

interface AuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  action?: string;
}

export function AuthModal({
  open,
  onOpenChange,
  action = "continue",
}: AuthModalProps) {
  const { setTier } = useUser();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const handleGoogleSignIn = () => {
    setTier("free");
    onOpenChange(false);
  };

  const content = (
    <div className="flex flex-col gap-4 py-2">
      <Button
        onClick={handleGoogleSignIn}
        className="w-full min-h-11"
        size="lg"
      >
        <LogIn size={18} />
        Continue with Google
      </Button>
      <p className="text-xs text-muted-foreground text-center">
        Free account includes: unlimited feed, brief summaries, 3 deep
        dives/day, and bookmarks.
      </p>
    </div>
  );

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="rounded-t-xl">
          <SheetHeader>
            <SheetTitle>Sign in to {action}</SheetTitle>
            <SheetDescription>
              Create a free account to unlock more features.
            </SheetDescription>
          </SheetHeader>
          {content}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Sign in to {action}</DialogTitle>
          <DialogDescription>
            Create a free account to unlock more features.
          </DialogDescription>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
}
