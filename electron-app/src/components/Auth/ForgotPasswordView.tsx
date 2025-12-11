import { useState } from 'react';
import { supabaseService } from '../../services/supabase';

interface ForgotPasswordViewProps {
  onBack: () => void;
}

const getErrorMessage = (error: unknown): string => {
  if (!(error instanceof Error)) {
    return 'Something went wrong. Please try again.';
  }

  const message = error.message.toLowerCase();

  if (message.includes('failed to fetch') || message.includes('network')) {
    return 'Unable to connect. Please check your internet connection.';
  }

  if (message.includes('rate limit') || message.includes('too many requests')) {
    return 'Too many attempts. Please wait a moment and try again.';
  }

  if (message.includes('invalid email')) {
    return 'Please enter a valid email address.';
  }

  return 'Failed to send reset email. Please try again.';
};

export function ForgotPasswordView({ onBack }: ForgotPasswordViewProps) {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEmailSent, setIsEmailSent] = useState(false);

  const isEmailValid = email.includes('@') && email.includes('.') && email.length > 5;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEmailValid) return;

    setIsLoading(true);
    setError(null);

    try {
      await supabaseService.resetPasswordForEmail(email);
      setIsEmailSent(true);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-full w-full flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        <div className="flex flex-col items-center w-full max-w-xs">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="w-14 h-14 rounded-2xl bg-accent/20 flex items-center justify-center mx-auto mb-3">
              {isEmailSent ? (
                <svg
                  className="w-7 h-7 text-accent"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              ) : (
                <svg
                  className="w-7 h-7 text-accent"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
              )}
            </div>
            <h1 className="text-xl font-bold text-white">
              {isEmailSent ? 'Check Your Email' : 'Reset Password'}
            </h1>
            <p className="text-sm text-white/60 mt-1">
              {isEmailSent
                ? 'We sent you a password reset link'
                : "Enter your email and we'll send you a reset link"}
            </p>
          </div>

          {isEmailSent ? (
            <div className="w-full space-y-4">
              <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                <p className="text-sm text-green-400 text-center">
                  Reset link sent to
                </p>
                <p className="text-sm text-green-300 text-center font-medium mt-1">
                  {email}
                </p>
              </div>

              <p className="text-xs text-white/40 text-center">
                Didn't receive the email? Check your spam folder or try again.
              </p>

              <button
                onClick={() => {
                  setIsEmailSent(false);
                  setEmail('');
                }}
                className="w-full py-3 rounded-lg bg-white/10 hover:bg-white/15 text-white text-sm font-medium transition-colors"
              >
                Try Different Email
              </button>

              <button
                onClick={onBack}
                className="w-full py-3 rounded-lg bg-accent hover:bg-accent-hover text-white text-sm font-semibold transition-all active:scale-[0.98]"
              >
                Back to Sign In
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="w-full space-y-3">
              <div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError(null);
                  }}
                  placeholder="Email address"
                  autoComplete="email"
                  className={`w-full px-4 py-2.5 rounded-lg bg-white/10 text-sm text-white placeholder-white/40 focus:outline-none focus:ring-2 transition-all ${
                    email && !isEmailValid
                      ? 'ring-2 ring-red-500/50 focus:ring-red-500/50'
                      : 'focus:ring-accent/50'
                  }`}
                />
                {email && !isEmailValid && (
                  <p className="text-xs text-red-400 mt-1 ml-1">Enter a valid email address</p>
                )}
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                  <p className="text-xs text-red-400 text-center">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={!isEmailValid || isLoading}
                className={`w-full py-3 rounded-lg bg-accent text-white text-sm font-semibold transition-all ${
                  !isEmailValid || isLoading
                    ? 'opacity-50 cursor-not-allowed'
                    : 'hover:bg-accent-hover active:scale-[0.98]'
                }`}
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Sending...
                  </span>
                ) : (
                  'Send Reset Link'
                )}
              </button>
            </form>
          )}

          {/* Back link */}
          {!isEmailSent && (
            <button
              onClick={onBack}
              className="mt-6 text-xs text-white/50 hover:text-white/70 transition-colors flex items-center gap-1"
            >
              <svg
                className="w-3 h-3"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              Back to Sign In
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
