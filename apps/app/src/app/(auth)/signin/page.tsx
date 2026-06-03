import type { Metadata } from "next";
import Link from "next/link";
import { UserAuthForm } from "@/components/auth/user-auth-form";
import { AuthLayout } from "@/components/auth/auth-layout";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to OpenVideo",
};

export default function SignInPage() {
  return (
    <AuthLayout headerLink={{ href: "/signup", label: "Sign up" }}>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-1.5 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
          <p className="text-sm text-muted-foreground">
            Enter your email to sign in to your account
          </p>
        </div>
        <UserAuthForm kind="signin" />
        <p className="text-center text-xs text-muted-foreground">
          By signing in, you agree to our{" "}
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
