import Link from "next/link";
import type { Metadata } from "next";
import { AuthCard, AuthCardHeader } from "@/components/ui/auth-card";
import { FormField } from "@/components/ui/form-field";
import { SubmitButton } from "@/components/ui/submit-button";

export const metadata: Metadata = {
  title: "Create account — TaskFlow",
};

export default function RegisterPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  return (
    <AuthCard>
      <AuthCardHeader
        title="Create your account"
        description="Start managing tasks smarter with AI"
      />

      {searchParams.error && (
        <div className="mb-6 flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive dark:border-destructive/40 dark:bg-destructive/20">
          <svg
            className="mt-0.5 h-4 w-4 flex-shrink-0"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          {searchParams.error === "email_taken"
            ? "An account with that email already exists."
            : "Something went wrong. Please try again."}
        </div>
      )}

      <form className="space-y-4" action="/api/auth/register" method="POST">
        <div className="grid grid-cols-2 gap-3">
          <FormField
            id="firstName"
            label="First name"
            type="text"
            placeholder="Jane"
            required
            autoComplete="given-name"
          />
          <FormField
            id="lastName"
            label="Last name"
            type="text"
            placeholder="Smith"
            required
            autoComplete="family-name"
          />
        </div>

        <FormField
          id="email"
          label="Email"
          type="email"
          placeholder="jane@example.com"
          required
          autoComplete="email"
        />

        <FormField
          id="password"
          label="Password"
          type="password"
          placeholder="At least 8 characters"
          required
          autoComplete="new-password"
        />

        <FormField
          id="confirmPassword"
          label="Confirm password"
          type="password"
          placeholder="Re-enter your password"
          required
          autoComplete="new-password"
        />

        <div className="pt-1">
          <SubmitButton>Create account</SubmitButton>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          By creating an account you agree to our{" "}
          <Link
            href="/terms"
            className="underline hover:text-foreground transition-colors"
          >
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link
            href="/privacy"
            className="underline hover:text-foreground transition-colors"
          >
            Privacy Policy
          </Link>
          .
        </p>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-medium text-primary hover:underline focus:outline-none focus:ring-1 focus:ring-ring rounded"
        >
          Sign in
        </Link>
      </p>
    </AuthCard>
  );
}
