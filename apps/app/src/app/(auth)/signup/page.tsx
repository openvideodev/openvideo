import type { Metadata } from "next";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { UserAuthForm } from "@/components/user-auth-form";
import { ArrowLeftIcon } from "lucide-react";

export const metadata: Metadata = {
  title: "Authentication",
  description: "Authentication forms built using the components.",
};

export default function AuthenticationPage() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-card px-4">
      <Link
        href="/"
        className={cn(
          buttonVariants({ variant: "outline" }),

          "absolute left-4 top-4 w-8 md:left-8 md:top-8 rounded-full",
        )}
      >
        <ArrowLeftIcon />
      </Link>

      <Link
        href="/signin"
        className={cn(
          buttonVariants({ variant: "outline" }),
          "absolute right-4 top-4 md:right-8 md:top-8 rounded-full",
        )}
      >
        Login
      </Link>
      <div className="w-full max-w-[380px]">
        <div className="flex w-full flex-col justify-center space-y-8">
          <div className="flex flex-col space-y-3 text-center">
            <h1 className="text-3xl md:text-4xl font-medium tracking-tight">Create an account</h1>
            <p className="text-sm text-muted-foreground">
              Enter your name, email, and optional profile photo to create your account
            </p>
          </div>
          <UserAuthForm kind="signup" />
          <p className="px-8 text-center text-sm text-muted-foreground">
            By signing up, you agree to our{" "}
            <Link
              href="/terms"
              className="underline underline-offset-4 hover:text-foreground transition-colors"
            >
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link
              href="/privacy"
              className="underline underline-offset-4 hover:text-foreground transition-colors"
            >
              Privacy Policy
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
