"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    name: ""
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (isLogin) {
        // Sign in with email and password
        const { data, error } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        });

        if (error) throw error;

        router.push("/dashboard");
        router.refresh();
      } else {
        // Sign up with email and password
        if (formData.password !== formData.confirmPassword) {
          setError("Passwords do not match");
          setLoading(false);
          return;
        }

        const { data, error } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            data: {
              name: formData.name,
            },
          },
        });

        if (error) throw error;

        // Check if email confirmation is required
        if (data?.user?.identities?.length === 0) {
          setError("This email is already registered. Please sign in instead.");
          setIsLogin(true);
        } else {
          setError("Check your email for the confirmation link!");
        }
      }
    } catch (error) {
      setError(error.message || "An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleGoogleLogin = async () => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) throw error;
    } catch (error) {
      setError(error.message || "Failed to sign in with Google");
    }
  };

  const handleGitHubLogin = async () => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) throw error;
    } catch (error) {
      setError(error.message || "Failed to sign in with GitHub");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#faf9f6] via-[#f4f1e8] to-[#e8e3d3] dark:from-[#1a1a1a] dark:via-[#2d2d2d] dark:to-[#3a3a3a] flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        {/* Logo and Back Link */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-[#c09080] to-[#d4c4dc] rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-2xl">OE</span>
            </div>
          </Link>
          <h1 className="text-3xl font-bold text-[#2d2d2d] dark:text-[#e8e3d3] mb-2">
            {isLogin ? "Welcome Back" : "Join OpenEducation"}
          </h1>
          <p className="text-[#5a5a5a] dark:text-[#b8b3a3]">
            {isLogin 
              ? "Access affordable, personalized learning for everyone" 
              : "Start your journey to accessible education"}
          </p>
        </div>

        {/* Main Form Card */}
        <div className="bg-[#faf9f6] dark:bg-[#2d2d2d] rounded-2xl shadow-xl p-8 border border-[#e8e3d3] dark:border-[#4a4a4a]">
          {/* Social Login Buttons */}
          <div className="space-y-3 mb-6">
            <button
              onClick={handleGoogleLogin}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 border-2 border-[#e8e3d3] dark:border-[#4a4a4a] rounded-lg hover:border-[#c09080] dark:hover:border-[#c09080] transition-colors bg-white dark:bg-[#1a1a1a]"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              <span className="font-medium text-[#2d2d2d] dark:text-[#e8e3d3]">
                Continue with Google
              </span>
            </button>
            
            <button
              onClick={handleGitHubLogin}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 border-2 border-[#e8e3d3] dark:border-[#4a4a4a] rounded-lg hover:border-[#c09080] dark:hover:border-[#c09080] transition-colors bg-white dark:bg-[#1a1a1a]"
            >
              <svg className="w-5 h-5 fill-current text-[#2d2d2d] dark:text-[#e8e3d3]" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
              <span className="font-medium text-[#2d2d2d] dark:text-[#e8e3d3]">
                Continue with GitHub
              </span>
            </button>
          </div>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#e8e3d3] dark:border-[#4a4a4a]"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-[#faf9f6] dark:bg-[#2d2d2d] text-[#5a5a5a] dark:text-[#b8b3a3]">
                Or continue with email
              </span>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-4 bg-[#f4d4d4] dark:bg-[#4a2d2d] border border-[#e8b3b3] dark:border-[#6a3d3d] rounded-lg">
              <p className="text-sm text-[#8a3a3a] dark:text-[#e8b3b3]">{error}</p>
            </div>
          )}

          {/* Email/Password Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-[#2d2d2d] dark:text-[#e8e3d3] mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required={!isLogin}
                  className="w-full px-4 py-3 border border-[#e8e3d3] dark:border-[#4a4a4a] rounded-lg focus:ring-2 focus:ring-[#c09080] focus:border-transparent dark:bg-[#1a1a1a] dark:text-[#e8e3d3] bg-white"
                  placeholder="John Doe"
                />
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-[#2d2d2d] dark:text-[#e8e3d3] mb-2">
                Email Address
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 border border-[#e8e3d3] dark:border-[#4a4a4a] rounded-lg focus:ring-2 focus:ring-[#c09080] focus:border-transparent dark:bg-[#1a1a1a] dark:text-[#e8e3d3] bg-white"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-[#2d2d2d] dark:text-[#e8e3d3] mb-2">
                Password
              </label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 border border-[#e8e3d3] dark:border-[#4a4a4a] rounded-lg focus:ring-2 focus:ring-[#c09080] focus:border-transparent dark:bg-[#1a1a1a] dark:text-[#e8e3d3] bg-white"
                placeholder="••••••••"
              />
            </div>

            {!isLogin && (
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-[#2d2d2d] dark:text-[#e8e3d3] mb-2">
                  Confirm Password
                </label>
                <input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required={!isLogin}
                  className="w-full px-4 py-3 border border-[#e8e3d3] dark:border-[#4a4a4a] rounded-lg focus:ring-2 focus:ring-[#c09080] focus:border-transparent dark:bg-[#1a1a1a] dark:text-[#e8e3d3] bg-white"
                  placeholder="••••••••"
                />
              </div>
            )}

            {isLogin && (
              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center">
                  <input type="checkbox" className="w-4 h-4 text-[#c09080] border-[#e8e3d3] rounded focus:ring-[#c09080]" />
                  <span className="ml-2 text-[#5a5a5a] dark:text-[#b8b3a3]">Remember me</span>
                </label>
                <Link href="/forgot-password" className="text-[#c09080] hover:text-[#d4c4dc] dark:text-[#d4c4dc] dark:hover:text-[#c09080]">
                  Forgot password?
                </Link>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full px-6 py-3 bg-gradient-to-r from-[#c09080] to-[#d4c4dc] text-white rounded-lg font-semibold hover:shadow-lg hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                  </svg>
                  Processing...
                </span>
              ) : (
                isLogin ? "Sign In" : "Create Account"
              )}
            </button>
          </form>

          {/* Toggle Login/Signup */}
          <div className="mt-6 text-center">
            <p className="text-[#5a5a5a] dark:text-[#b8b3a3]">
              {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
              <button
                type="button"
                onClick={() => {
                  setIsLogin(!isLogin);
                  setError("");
                }}
                className="text-[#c09080] hover:text-[#d4c4dc] dark:text-[#d4c4dc] dark:hover:text-[#c09080] font-semibold"
              >
                {isLogin ? "Sign Up" : "Sign In"}
              </button>
            </p>
          </div>

          {/* Free Access Badge */}
          {!isLogin && (
            <div className="mt-6 p-4 bg-[#e8e3d3] dark:bg-[#4a4a4a] rounded-lg border border-[#d4c4dc] dark:border-[#5a5a5a]">
              <div className="flex items-center gap-2 text-sm text-[#2d2d2d] dark:text-[#e8e3d3]">
                <span className="text-xl">🎓</span>
                <p>
                  <strong>Free forever.</strong> We believe in making quality education accessible to everyone.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Additional Info */}
        <p className="text-center text-sm text-[#5a5a5a] dark:text-[#b8b3a3] mt-6">
          By continuing, you agree to our{" "}
          <Link href="/terms" className="text-[#c09080] hover:text-[#d4c4dc] dark:text-[#d4c4dc]">
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="text-[#c09080] hover:text-[#d4c4dc] dark:text-[#d4c4dc]">
            Privacy Policy
          </Link>
        </p>
      </div>
    </div>
  );
}
