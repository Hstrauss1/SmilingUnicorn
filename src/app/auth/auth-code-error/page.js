import Link from 'next/link'

export default function AuthCodeError() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#faf9f6] via-[#f4f1e8] to-[#e8e3d3] dark:from-[#1a1a1a] dark:via-[#2d2d2d] dark:to-[#3a3a3a] flex items-center justify-center px-6">
      <div className="max-w-md w-full bg-[#faf9f6] dark:bg-[#2d2d2d] rounded-2xl shadow-xl p-8 border border-[#e8e3d3] dark:border-[#4a4a4a] text-center">
        <div className="text-6xl mb-4">⚠️</div>
        <h1 className="text-2xl font-bold text-[#2d2d2d] dark:text-[#e8e3d3] mb-4">
          Authentication Error
        </h1>
        <p className="text-[#5a5a5a] dark:text-[#b8b3a3] mb-6">
          Sorry, we couldn&apos;t complete your sign in. Please try again.
        </p>
        <Link
          href="/login"
          className="inline-block px-6 py-3 bg-gradient-to-r from-[#c09080] to-[#d4c4dc] text-white rounded-lg font-semibold hover:shadow-lg hover:scale-105 transition-all"
        >
          Return to Login
        </Link>
      </div>
    </div>
  )
}
