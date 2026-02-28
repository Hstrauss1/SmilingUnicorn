import Link from "next/link";

export default function CTA() {
  return (
    <section className="py-20 px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 to-purple-600 rounded-3xl p-12 md:p-16 text-center">
          <div className="absolute inset-0 bg-grid-white/10 [mask-image:linear-gradient(0deg,transparent,black)]"></div>
          <div className="relative z-10">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Ready to Transform Your Learning?
            </h2>
            <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
              Join thousands of learners who are already using AI to master new skills faster and more effectively.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/upload"
                className="px-8 py-4 bg-white text-blue-600 rounded-full font-semibold text-lg hover:shadow-2xl hover:scale-105 transition-all w-full sm:w-auto"
              >
                Get Started Free
              </Link>
              <Link
                href="/#features"
                className="px-8 py-4 bg-transparent text-white rounded-full font-semibold text-lg border-2 border-white hover:bg-white hover:text-blue-600 transition-all w-full sm:w-auto"
              >
                Learn More
              </Link>
            </div>
            <p className="text-blue-100 mt-6">
              No credit card required • Start learning in minutes
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
