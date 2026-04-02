import Link from "next/link";
import type { Metadata } from "next";
import { AuthCard, AuthCardHeader } from "@/components/ui/auth-card";
import { FormField } from "@/components/ui/form-field";
import { SubmitButton } from "@/components/ui/submit-button";

export const metadata: Metadata = {
  title: "Sign in — TaskFlow",
};

export default function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string; registered?: string };
}) {
  return (
    <AuthCard>
      <AuthCardHeader
        title="Welcome back"
        description="Sign in to your TaskFlow account"
      />

      {searchParams.registered && (
        <div className="mb-6 flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800 dark:border-green-800/40 dark:bg-green-900/20 dark:text-green-400">
          <svg
            className="mt-0.5 h-4 w-4 flex-shrink-0"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
          Account created! You can now sign in.
        </div>
      )}

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
          {searchParams.error === "invalid_credentials"
            ? "Invalid email or password."
            : "Something went wrong. Please try again."}
        </div>
      )}

      <form className="space-y-4" action="/api/auth/login" method="POST">
        <FormField
          id="email"
          label="Email"
          type="email"
          placeholder="you@example.com"
          required
          autoComplete="email"
        />
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label
              htmlFor="password"
              className="block text-sm font-medium text-foreground"
            >
              Password
              <span className="ml-1 text-destructive" aria-hidden="true">
                *
              </span>
            </label>
            <Link
              href="/forgot-password"
              className="text-xs text-primary hover:underline focus:outline-none focus:ring-1 focus:ring-ring rounded"
            >
              Forgot password?
            </Link>
          </div>
          <input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            className="block w-full rounded-lg px-3.5 py-2.5 text-sm bg-background text-foreground border border-input placeholder:text-muted-foreground transition-colors duration-150 hover:border-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 focus:ring-offset-background"
          />
        </div>

        <div className="pt-1">
          <SubmitButton>Sign in</SubmitButton>
        </div>
      </form>

      <div className="mt-6 flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs text-muted-foreground">or</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{" "}
        <Link
          href="/register"
          className="font-medium text-primary hover:underline focus:outline-none focus:ring-1 focus:ring-ring rounded"
        >
          Create one free
        </Link>
      </p>
    </AuthCard>
  );
}
