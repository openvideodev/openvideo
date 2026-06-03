import type { Metadata } from "next";
import Link from "next/link";
import { UserAuthForm } from "@/components/auth/user-auth-form";
import { AuthLayout } from "@/components/auth/auth-layout";

export const metadata: Metadata = {
  title: "Sign up",
  description: "Create your OpenVideo account",
};

export default function SignUpPage() {
  return (
    <AuthLayout headerLink={{ href: "/signin", label: "Sign in" }}>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-1.5 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Create an account</h1>
          <p className="text-sm text-muted-foreground">Enter your email to get started</p>
        </div>
        <UserAuthForm kind="signup" />
        <p className="text-center text-xs text-muted-foreground">
          By signing up, you agree to our{" "}
          <Link
            href="/terms"
            className="hover:text-foreground underline underline-offset-4 transition-colors"
          >
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link
            href="/privacy"
            className="hover:text-foreground underline underline-offset-4 transition-colors"
          >
            Privacy Policy
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
