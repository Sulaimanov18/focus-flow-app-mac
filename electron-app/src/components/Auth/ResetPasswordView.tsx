import { useState, useEffect } from 'react';
import { supabaseService, supabase } from '../../services/supabase';

interface ResetPasswordViewProps {
  onSuccess: () => void;
}

const getErrorMessage = (error: unknown): string => {
  if (!(error instanceof Error)) {
    return 'Something went wrong. Please try again.';
  }

  const message = error.message.toLowerCase();

  if (message.includes('failed to fetch') || message.includes('network')) {
    return 'Unable to connect. Please check your internet connection.';
  }

  if (message.includes('weak password') || message.includes('should be at least')) {
    return 'Password is too weak. Use at least 6 characters.';
  }

  if (message.includes('same password') || message.includes('different')) {
    return 'New password must be different from your current password.';
  }

  if (message.includes('session') || message.includes('expired') || message.includes('invalid')) {
    return 'This reset link has expired. Please request a new one.';
  }

  return 'Failed to update password. Please try again.';
};

export function ResetPasswordView({ onSuccess }: ResetPasswordViewProps) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isValidSession, setIsValidSession] = useState<boolean | null>(null);

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsValidSession(!!session);
    };
    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsValidSession(true);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const passwordValid = password.length >= 6;
  const passwordsMatch = password === confirmPassword;
  const isFormValid = passwordValid && passwordsMatch;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;

    setIsLoading(true);
    setError(null);

    try {
      await supabaseService.updatePassword(password);
      setIsSuccess(true);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  // Loading state
  if (isValidSession === null) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center">
        <div className="flex items-center gap-2 text-white/50 text-sm">
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
          Verifying reset link...
        </div>
      </div>
    );
  }

  // Invalid session state
  if (!isValidSession) {
    return (
      <div className="h-full w-full flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center px-6">
          <div className="flex flex-col items-center w-full max-w-xs">
            <div className="text-center mb-6">
              <div className="w-14 h-14 rounded-2xl bg-red-500/20 flex items-center justify-center mx-auto mb-3">
                <svg
                  className="w-7 h-7 text-red-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <h1 className="text-xl font-bold text-white">Link Expired</h1>
              <p className="text-sm text-white/60 mt-1">
                This password reset link is invalid or has expired.
              </p>
            </div>

            <div className="w-full space-y-3">
              <p className="text-xs text-white/40 text-center">
                Please request a new password reset link.
              </p>
              <button
                onClick={onSuccess}
                className="w-full py-3 rounded-lg bg-accent hover:bg-accent-hover text-white text-sm font-semibold transition-all active:scale-[0.98]"
              >
                Back to Sign In
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Success state
  if (isSuccess) {
    return (
      <div className="h-full w-full flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center px-6">
          <div className="flex flex-col items-center w-full max-w-xs">
            <div className="text-center mb-6">
              <div className="w-14 h-14 rounded-2xl bg-green-500/20 flex items-center justify-center mx-auto mb-3">
                <svg
                  className="w-7 h-7 text-green-400"
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
              </div>
              <h1 className="text-xl font-bold text-white">Password Updated</h1>
              <p className="text-sm text-white/60 mt-1">
                Your password has been successfully changed.
              </p>
            </div>

            <button
              onClick={onSuccess}
              className="w-full py-3 rounded-lg bg-accent hover:bg-accent-hover text-white text-sm font-semibold transition-all active:scale-[0.98]"
            >
              Sign In with New Password
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Form state
  return (
    <div className="h-full w-full flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        <div className="flex flex-col items-center w-full max-w-xs">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="w-14 h-14 rounded-2xl bg-accent/20 flex items-center justify-center mx-auto mb-3">
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
                  d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
                />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-white">Create New Password</h1>
            <p className="text-sm text-white/60 mt-1">
              Enter your new password below
            </p>
          </div>

          <form onSubmit={handleSubmit} className="w-full space-y-3">
            <div>
              <input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError(null);
                }}
                placeholder="New password"
                autoComplete="new-password"
                className={`w-full px-4 py-2.5 rounded-lg bg-white/10 text-sm text-white placeholder-white/40 focus:outline-none focus:ring-2 transition-all ${
                  password && !passwordValid
                    ? 'ring-2 ring-red-500/50 focus:ring-red-500/50'
                    : 'focus:ring-accent/50'
                }`}
              />
              {password && !passwordValid && (
                <p className="text-xs text-red-400 mt-1 ml-1">Password must be at least 6 characters</p>
              )}
            </div>

            <div>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  setError(null);
                }}
                placeholder="Confirm new password"
                autoComplete="new-password"
                className={`w-full px-4 py-2.5 rounded-lg bg-white/10 text-sm text-white placeholder-white/40 focus:outline-none focus:ring-2 transition-all ${
                  confirmPassword && !passwordsMatch
                    ? 'ring-2 ring-red-500/50 focus:ring-red-500/50'
                    : 'focus:ring-accent/50'
                }`}
              />
              {confirmPassword && !passwordsMatch && (
                <p className="text-xs text-red-400 mt-1 ml-1">Passwords do not match</p>
              )}
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                <p className="text-xs text-red-400 text-center">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={!isFormValid || isLoading}
              className={`w-full py-3 rounded-lg bg-accent text-white text-sm font-semibold transition-all ${
                !isFormValid || isLoading
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
                  Updating...
                </span>
              ) : (
                'Update Password'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
