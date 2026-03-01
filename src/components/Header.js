"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function Header() {
  const router = useRouter();
  const supabase = createClient();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  };

  const userName = user?.user_metadata?.name || user?.email?.split('@')[0] || 'User';

  return (
    <header className="fixed top-0 w-full bg-[#faf9f6]/90 dark:bg-[#1a1a1a]/90 backdrop-blur-md z-50 border-b border-[#e8e3d3] dark:border-[#4a4a4a]">
      <nav className="mx-auto max-w-7xl px-6 lg:px-8" aria-label="Top">
        <div className="flex w-full items-center justify-between py-4">
          <div className="flex items-center">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-br from-[#c09080] to-[#d4c4dc] rounded-lg flex items-center justify-center shadow-sm">
                <span className="text-white font-bold text-xl">OE</span>
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-[#c09080] to-[#d4c4dc] bg-clip-text text-transparent">
                OpenEducation
              </span>
            </Link>
          </div>
          
          <div className="hidden md:flex items-center gap-8">
            {user ? (
              // Logged in navigation
              <>
                <Link href="/dashboard" className="text-[#2d2d2d] dark:text-[#b8b3a3] hover:text-[#c09080] dark:hover:text-[#d4c4dc] transition-colors">
                  Dashboard
                </Link>
                <Link href="/upload" className="text-[#2d2d2d] dark:text-[#b8b3a3] hover:text-[#c09080] dark:hover:text-[#d4c4dc] transition-colors">
                  Upload
                </Link>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-[#5a5a5a] dark:text-[#b8b3a3]">
                    {userName}
                  </span>
                  <button
                    onClick={handleSignOut}
                    className="px-6 py-2.5 bg-gradient-to-r from-[#c09080] to-[#d4c4dc] text-white rounded-full font-semibold hover:shadow-lg hover:scale-105 transition-all"
                  >
                    Sign Out
                  </button>
                </div>
              </>
            ) : (
              // Logged out navigation
              <>
                <Link href="/#features" className="text-[#2d2d2d] dark:text-[#b8b3a3] hover:text-[#c09080] dark:hover:text-[#d4c4dc] transition-colors">
                  Features
                </Link>
                <Link href="/#how-it-works" className="text-[#2d2d2d] dark:text-[#b8b3a3] hover:text-[#c09080] dark:hover:text-[#d4c4dc] transition-colors">
                  How It Works
                </Link>
                <Link href="/login" className="text-[#2d2d2d] dark:text-[#b8b3a3] hover:text-[#c09080] dark:hover:text-[#d4c4dc] transition-colors">
                  Sign In
                </Link>
                <Link
                  href="/login"
                  className="px-6 py-2.5 bg-gradient-to-r from-[#c09080] to-[#d4c4dc] text-white rounded-full font-semibold hover:shadow-lg hover:scale-105 transition-all"
                >
                  Get Started Free
                </Link>
              </>
            )}
          </div>

          <button
            className="md:hidden p-2"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-[#e8e3d3] dark:border-[#4a4a4a]">
            <div className="flex flex-col gap-4">
              {user ? (
                // Logged in mobile navigation
                <>
                  <Link href="/dashboard" className="text-[#2d2d2d] dark:text-[#b8b3a3] hover:text-[#c09080] dark:hover:text-[#d4c4dc] transition-colors">
                    Dashboard
                  </Link>
                  <Link href="/upload" className="text-[#2d2d2d] dark:text-[#b8b3a3] hover:text-[#c09080] dark:hover:text-[#d4c4dc] transition-colors">
                    Upload
                  </Link>
                  <span className="text-sm text-[#5a5a5a] dark:text-[#b8b3a3] py-2">
                    {userName}
                  </span>
                  <button
                    onClick={handleSignOut}
                    className="px-6 py-2.5 bg-gradient-to-r from-[#c09080] to-[#d4c4dc] text-white rounded-full font-semibold text-center"
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                // Logged out mobile navigation
                <>
                  <Link href="/#features" className="text-[#2d2d2d] dark:text-[#b8b3a3] hover:text-[#c09080] dark:hover:text-[#d4c4dc] transition-colors">
                    Features
                  </Link>
                  <Link href="/#how-it-works" className="text-[#2d2d2d] dark:text-[#b8b3a3] hover:text-[#c09080] dark:hover:text-[#d4c4dc] transition-colors">
                    How It Works
                  </Link>
                  <Link href="/login" className="text-[#2d2d2d] dark:text-[#b8b3a3] hover:text-[#c09080] dark:hover:text-[#d4c4dc] transition-colors">
                    Sign In
                  </Link>
                  <Link
                    href="/login"
                    className="px-6 py-2.5 bg-gradient-to-r from-[#c09080] to-[#d4c4dc] text-white rounded-full font-semibold text-center"
                  >
                    Get Started Free
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}
