"use client";

import { useEffect, useState } from "react";
import { Zap, Check } from "lucide-react";
import { Button } from "@/shared/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/shared/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/shared/ui/sheet";
import { useUser } from "@/entities/user";
import { PRO_PRICE_MONTHLY } from "@/shared/config/constants";

interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  action?: string;
}

const benefits = [
  "Unlimited deep dives",
  "Full AI brief analysis",
  "Keyword tracking & notifications",
];

export function UpgradeModal({
  open,
  onOpenChange,
  action = "access this feature",
}: UpgradeModalProps) {
  const { setTier } = useUser();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const handleUpgrade = () => {
    setTier("pro");
    onOpenChange(false);
  };

  const content = (
    <div className="flex flex-col gap-4 py-2">
      <ul className="space-y-2">
        {benefits.map((benefit) => (
          <li key={benefit} className="flex items-center gap-2 text-sm">
            <Check size={16} className="text-green-600 shrink-0" />
            {benefit}
          </li>
        ))}
      </ul>
      <Button
        onClick={handleUpgrade}
        className="w-full min-h-11"
        size="lg"
      >
        <Zap size={18} />
        Upgrade to Pro &mdash; ${PRO_PRICE_MONTHLY}/mo
      </Button>
      <p className="text-xs text-muted-foreground text-center">
        Cancel anytime. No commitment.
      </p>
    </div>
  );

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="rounded-t-xl">
          <SheetHeader>
            <SheetTitle>Upgrade to Pro to {action}</SheetTitle>
            <SheetDescription>
              ${PRO_PRICE_MONTHLY}/month &mdash; cancel anytime
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
          <DialogTitle>Upgrade to Pro to {action}</DialogTitle>
          <DialogDescription>
            ${PRO_PRICE_MONTHLY}/month &mdash; cancel anytime
          </DialogDescription>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
}
