import { useState } from 'react';
import { useAppStore } from '../../stores/useAppStore';
import { supabaseService } from '../../services/supabase';
import { ForgotPasswordView } from './ForgotPasswordView';
import { ResetPasswordView } from './ResetPasswordView';

const getErrorMessage = (error: unknown, isSignUp: boolean): string => {
  if (!(error instanceof Error)) {
    return 'Something went wrong. Please try again.';
  }

  const message = error.message.toLowerCase();

  // Network errors
  if (message.includes('failed to fetch') || message.includes('network')) {
    return 'Unable to connect. Please check your internet connection.';
  }

  // Auth errors
  if (message.includes('invalid login credentials') || message.includes('invalid_credentials')) {
    return 'Invalid email or password. Please try again.';
  }

  if (message.includes('email not confirmed')) {
    return 'Please verify your email before signing in.';
  }

  if (message.includes('user already registered') || message.includes('already exists')) {
    return 'An account with this email already exists.';
  }

  if (message.includes('weak password') || message.includes('password')) {
    return 'Password is too weak. Use at least 6 characters.';
  }

  if (message.includes('rate limit') || message.includes('too many requests')) {
    return 'Too many attempts. Please wait a moment and try again.';
  }

  if (message.includes('invalid email')) {
    return 'Please enter a valid email address.';
  }

  // Default messages
  if (isSignUp) {
    return 'Could not create account. Please try again.';
  }
  return 'Could not sign in. Please check your credentials.';
};

export function AuthView() {
  const { setIsLoggedIn, setCurrentUser, setSelectedTab, authView, setAuthView } = useAppStore();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (authView === 'forgot-password') {
    return <ForgotPasswordView onBack={() => setAuthView('login')} />;
  }

  if (authView === 'reset-password') {
    return <ResetPasswordView onSuccess={() => setAuthView('login')} />;
  }

  const emailValid = email.includes('@') && email.includes('.') && email.length > 5;
  const passwordValid = password.length >= 6;
  const passwordsMatch = password === confirmPassword;

  const isFormValid = () => {
    if (isSignUp) {
      return emailValid && passwordValid && passwordsMatch;
    }
    return emailValid && passwordValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid()) return;

    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      if (isSignUp) {
        const result = await supabaseService.signUp(email, password);
        if (result.user && !result.session) {
          setSuccessMessage('Account created! Please check your email to verify.');
          setEmail('');
          setPassword('');
          setConfirmPassword('');
          return;
        }
      } else {
        await supabaseService.signIn(email, password);
      }

      const user = await supabaseService.getCurrentUser();
      if (user) {
        setCurrentUser(user);
        setIsLoggedIn(true);
        setSelectedTab('timer');
      }
    } catch (err) {
      setError(getErrorMessage(err, isSignUp));
    } finally {
      setIsLoading(false);
    }
  };

  const handleModeSwitch = () => {
    setIsSignUp(!isSignUp);
    setError(null);
    setSuccessMessage(null);
    setPassword('');
    setConfirmPassword('');
  };

  const skipAuth = () => {
    setIsLoggedIn(false);
    setSelectedTab('timer');
  };

  return (
    <div className="h-full w-full flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        <div className="flex flex-col items-center w-full max-w-xs">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="w-14 h-14 rounded-2xl bg-accent/20 flex items-center justify-center mx-auto mb-3">
              <svg
                className="w-7 h-7 text-accent"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M15 1H9v2h6V1zm-4 13h2V8h-2v6zm8.03-6.61l1.42-1.42c-.43-.51-.9-.99-1.41-1.41l-1.42 1.42C16.07 4.74 14.12 4 12 4c-4.97 0-9 4.03-9 9s4.02 9 9 9 9-4.03 9-9c0-2.12-.74-4.07-1.97-5.61zM12 20c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-white">FocusFlow</h1>
            <p className="text-sm text-white/60 mt-1">
              {isSignUp ? 'Create your account' : 'Welcome back'}
            </p>
          </div>

          {/* Success Message */}
          {successMessage && (
            <div className="w-full mb-4 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
              <p className="text-xs text-green-400 text-center">{successMessage}</p>
            </div>
          )}

          {/* Form */}
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
                  email && !emailValid
                    ? 'ring-2 ring-red-500/50 focus:ring-red-500/50'
                    : 'focus:ring-accent/50'
                }`}
              />
              {email && !emailValid && (
                <p className="text-xs text-red-400 mt-1 ml-1">Enter a valid email address</p>
              )}
            </div>

            <div>
              <input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError(null);
                }}
                placeholder="Password"
                autoComplete={isSignUp ? 'new-password' : 'current-password'}
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

            {isSignUp && (
              <div>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    setError(null);
                  }}
                  placeholder="Confirm password"
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
            )}

            {/* Error Message */}
            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                <p className="text-xs text-red-400 text-center">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={!isFormValid() || isLoading}
              className={`w-full py-3 rounded-lg bg-accent text-white text-sm font-semibold transition-all ${
                !isFormValid() || isLoading
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
                  {isSignUp ? 'Creating account...' : 'Signing in...'}
                </span>
              ) : isSignUp ? (
                'Create Account'
              ) : (
                'Sign In'
              )}
            </button>

            {!isSignUp && (
              <button
                type="button"
                onClick={() => setAuthView('forgot-password')}
                className="w-full text-xs text-white/50 hover:text-white/70 transition-colors py-1"
              >
                Forgot password?
              </button>
            )}
          </form>

          {/* Toggle sign up / sign in */}
          <div className="mt-6 text-center">
            <span className="text-xs text-white/40">
              {isSignUp ? 'Already have an account?' : "Don't have an account?"}
            </span>
            <button
              onClick={handleModeSwitch}
              className="ml-1 text-xs text-accent hover:text-accent-hover font-medium transition-colors"
            >
              {isSignUp ? 'Sign In' : 'Sign Up'}
            </button>
          </div>

          {/* Skip */}
          <button
            onClick={skipAuth}
            className="mt-4 text-xs text-white/30 hover:text-white/50 transition-colors"
          >
            Continue without account
          </button>
        </div>
      </div>
    </div>
  );
}
