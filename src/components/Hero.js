import Link from "next/link";

export default function Hero() {
  return (
    <section className="pt-32 pb-20 px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="text-center">
          <div className="mb-6 inline-flex items-center gap-2 px-4 py-2 bg-[#e8e3d3] dark:bg-[#4a4a4a] rounded-full text-sm font-medium text-[#5a5a5a] dark:text-[#b8b3a3]">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#c09080] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#c09080]"></span>
            </span>
            AI-Powered Learning
          </div>

          <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-[#2d2d2d] dark:text-[#e8e3d3] mb-6">
            <span className="bg-gradient-to-r from-[#c09080] to-[#d4c4dc] bg-clip-text text-transparent">
              Accessible Tutoring
            </span>
            <span> for Everyone, Everywhere</span>
          </h1>

          <p className="mt-6 text-xl text-[#5a5a5a] dark:text-[#b8b3a3] max-w-3xl mx-auto leading-relaxed">
            Breaking down barriers to learning. Upload any document and let our
            AI create free, personalized learning roadmaps.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/upload"
              className="px-8 py-4 bg-gradient-to-r from-[#c09080] to-[#d4c4dc] text-white rounded-full font-semibold text-lg hover:shadow-2xl hover:scale-105 transition-all w-full sm:w-auto"
            >
              Start Learning Now
            </Link>
            <Link
              href="/#how-it-works"
              className="px-8 py-4 bg-[#faf9f6] dark:bg-[#2d2d2d] text-[#2d2d2d] dark:text-[#e8e3d3] rounded-full font-semibold text-lg border-2 border-[#e8e3d3] dark:border-[#4a4a4a] hover:border-[#c09080] dark:hover:border-[#c09080] transition-all w-full sm:w-auto"
            >
              See How It Works
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
