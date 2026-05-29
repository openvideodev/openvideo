import type { Metadata } from "next";
import BackNav from "@/components/back-nav";

export const metadata: Metadata = {
  title: "Confirm",
  description: "Confirm your email to combo.",
};

export default function AuthenticationPage() {
  //confirm
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-card px-4">
      <BackNav />

      <div className="w-full max-w-[380px]">
        <div className="flex w-full flex-col justify-center space-y-8">
          <div className="flex flex-col space-y-4 text-center items-center">
            {/* <CheckCircleIcon className="h-8 w-8 text-muted-foreground" /> */}
            <h1 className="text-3xl md:text-4xl font-medium tracking-tight">Check your email</h1>
            <p className="text-sm text-muted-foreground">
              We emailed a magic link to your email address. Click the link to continue.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
