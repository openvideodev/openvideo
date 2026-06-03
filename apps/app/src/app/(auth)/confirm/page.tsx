import type { Metadata } from "next";
import Link from "next/link";
import { IconMail } from "@tabler/icons-react";
import { AuthLayout } from "@/components/auth/auth-layout";

export const metadata: Metadata = {
  title: "Check your email",
  description: "Confirm your email to continue",
};

export default function ConfirmPage() {
  return (
    <AuthLayout variant="single">
      <div className="flex flex-col items-center gap-6 text-center">
        <div className="p-4 rounded-full bg-secondary/50">
          <IconMail className="size-6 text-muted-foreground" />
        </div>
        <div className="flex flex-col gap-1.5">
          <h1 className="text-2xl font-semibold tracking-tight">Check your email</h1>
          <p className="text-sm text-muted-foreground">
            We sent a magic link to your email address. Click the link to sign in.
          </p>
        </div>
        <div className="text-xs text-muted-foreground">
          Didn&apos;t receive it?{" "}
          <Link href="/signin" className="text-foreground hover:underline underline-offset-4">
            Try again
          </Link>
        </div>
      </div>
    </AuthLayout>
  );
}
