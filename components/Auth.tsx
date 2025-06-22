import React, { useState } from 'react';
import { User } from '../types';
import { supabase, supabaseService } from '../services/supabaseService';
import { APP_NAME } from '../constants';
import { LoginIcon } from './icons';
import { Provider } from '@supabase/supabase-js';

interface AuthProps {
  // onLogin is no longer needed, as App.tsx will listen to auth state changes directly
}

const Auth: React.FC<AuthProps> = () => {
  const [isLoginView, setIsLoginView] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);


  const handleAuthAction = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (isLoginView) {
        // Login
        await supabaseService.login(email, password);
        // The onAuthStateChange in App.tsx will handle the user state update.
      } else {
        // Sign Up
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        if (data.user?.identities?.length === 0) {
            setError("User already exists. Please try logging in.");
        } else {
            setMessage('Check your email for the confirmation link!');
        }
      }
    } catch (err) {
      setError((err as Error).message || `An error occurred. Please try again.`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOAuthLogin = async (provider: Provider) => {
    setIsLoading(true);
    setError(null);
    try {
        await supabase.auth.signInWithOAuth({ provider });
    } catch (err) {
        setError((err as Error).message);
        setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 px-4">
      <div className="bg-gray-800 p-8 rounded-lg shadow-2xl w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-teal-400 font-orbitron">{APP_NAME}</h1>
          <p className="text-gray-400 mt-2">
            {isLoginView ? 'Log in to manage your productivity.' : 'Create an account to get started.'}
          </p>
        </div>
        
        <form onSubmit={handleAuthAction} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-300">
              Email Address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md shadow-sm placeholder-gray-500 focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm text-gray-100"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-300">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md shadow-sm placeholder-gray-500 focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm text-gray-100"
              placeholder="••••••••"
            />
          </div>
          
          {error && <p className="text-sm text-red-400 text-center">{error}</p>}
          {message && <p className="text-sm text-green-400 text-center">{message}</p>}

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-teal-500 disabled:opacity-50 transition-colors"
            >
              {isLoading ? (
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <LoginIcon className="w-5 h-5 mr-2" />
              )}
              {isLoading ? 'Processing...' : (isLoginView ? 'Log In' : 'Sign Up')}
            </button>
          </div>
        </form>
        
        <div className="mt-6 text-center">
            <button 
              onClick={() => {
                setIsLoginView(!isLoginView);
                setError(null);
                setMessage(null);
              }}
              className="text-sm text-teal-400 hover:text-teal-300 transition-colors"
            >
              {isLoginView ? 'Need an account? Sign Up' : 'Already have an account? Log In'}
            </button>
        </div>

        <div className="mt-6">
            <div className="relative">
                <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-600" />
                </div>
                <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-gray-800 text-gray-400">Or continue with</span>
                </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
                <div>
                    <button onClick={() => handleOAuthLogin('google')} className="w-full inline-flex justify-center py-2 px-4 border border-gray-600 rounded-md shadow-sm bg-gray-700 text-sm font-medium text-gray-300 hover:bg-gray-600 transition-colors">
                        Google
                    </button>
                </div>
                <div>
                    <button onClick={() => handleOAuthLogin('apple')} className="w-full inline-flex justify-center py-2 px-4 border border-gray-600 rounded-md shadow-sm bg-gray-700 text-sm font-medium text-gray-300 hover:bg-gray-600 transition-colors">
                        Apple
                    </button>
                </div>
            </div>
        </div>

      </div>
    </div>
  );
};

export default Auth;
