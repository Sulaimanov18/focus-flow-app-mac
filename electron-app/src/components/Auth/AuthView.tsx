import { useState } from 'react';
import { useAppStore } from '../../stores/useAppStore';

export function AuthView() {
  const { setIsLoggedIn, setCurrentUser, setSelectedTab } = useAppStore();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isFormValid = () => {
    const emailValid = email.includes('@') && email.includes('.');
    const passwordValid = password.length >= 6;

    if (isSignUp) {
      return emailValid && passwordValid && password === confirmPassword;
    }
    return emailValid && passwordValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid()) return;

    setIsLoading(true);
    setError(null);

    try {
      // TODO: Implement Supabase auth
      // For now, simulate auth
      await new Promise((resolve) => setTimeout(resolve, 1000));

      setCurrentUser({
        id: 'demo-user',
        email,
        displayName: email.split('@')[0],
      });
      setIsLoggedIn(true);
    } catch (err) {
      setError('Authentication failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const skipAuth = () => {
    setIsLoggedIn(false);
    setSelectedTab('timer');
  };

  return (
    <div className="flex flex-col items-center h-full py-6 px-4">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="w-12 h-12 rounded-2xl bg-accent/20 flex items-center justify-center mx-auto mb-3">
          <svg
            className="w-6 h-6 text-accent"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M15 1H9v2h6V1zm-4 13h2V8h-2v6zm8.03-6.61l1.42-1.42c-.43-.51-.9-.99-1.41-1.41l-1.42 1.42C16.07 4.74 14.12 4 12 4c-4.97 0-9 4.03-9 9s4.02 9 9 9 9-4.03 9-9c0-2.12-.74-4.07-1.97-5.61zM12 20c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z" />
          </svg>
        </div>
        <h1 className="text-lg font-bold text-white">FocusFlow</h1>
        <p className="text-xs text-white/50 mt-1">
          {isSignUp ? 'Create your account' : 'Welcome back'}
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="w-full max-w-xs space-y-3">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          className="w-full px-3 py-2 rounded-lg bg-white/10 text-sm text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-accent/50"
        />

        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="w-full px-3 py-2 rounded-lg bg-white/10 text-sm text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-accent/50"
        />

        {isSignUp && (
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm Password"
            className="w-full px-3 py-2 rounded-lg bg-white/10 text-sm text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-accent/50"
          />
        )}

        {error && (
          <p className="text-xs text-red-400 text-center">{error}</p>
        )}

        <button
          type="submit"
          disabled={!isFormValid() || isLoading}
          className={`w-full py-2.5 rounded-lg bg-accent hover:bg-accent-hover text-white text-sm font-medium transition-colors ${
            !isFormValid() || isLoading ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          {isLoading ? 'Loading...' : isSignUp ? 'Sign Up' : 'Sign In'}
        </button>
      </form>

      {/* Toggle sign up / sign in */}
      <button
        onClick={() => setIsSignUp(!isSignUp)}
        className="mt-4 text-xs text-accent hover:text-accent-hover transition-colors"
      >
        {isSignUp
          ? 'Already have an account? Sign In'
          : "Don't have an account? Sign Up"}
      </button>

      {/* Skip */}
      <button
        onClick={skipAuth}
        className="mt-auto text-xs text-white/40 hover:text-white/60 transition-colors"
      >
        Continue without account
      </button>
    </div>
  );
}
