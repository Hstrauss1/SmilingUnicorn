export default function HowItWorks() {
  const steps = [
    {
      number: "01",
      title: "Upload Your Document",
      description: "Simply drag and drop or select your PDF(s).",
      icon: "📤"
    },
    {
      number: "02",
      title: "AI Analyzes Content",
      description: "Our AI engine processes your document, identifying key concepts, topics, and learning objectives.",
      icon: "🧠"
    },
    {
      number: "03",
      title: "Customize Your Path",
      description: "Set your course topic to personalize your roadmap.",
      icon: "⚙️"
    },
    {
      number: "04",
      title: "Start Learning",
      description: "Follow your roadmap, track progress, and achieve your learning goals efficiently.",
      icon: "🚀"
    }
  ];

  return (
    <section id="how-it-works" className="py-20 px-6 lg:px-8 bg-gradient-to-br from-[#e8e3d3] via-[#f4f1e8] to-[#e6dff0] dark:from-[#2d2d2d] dark:via-[#3a3a3a] dark:to-[#524a5a]">
      <div className="mx-auto max-w-7xl">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-[#2d2d2d] dark:text-[#e8e3d3] mb-4">
            How It Works
          </h2>
          <p className="text-xl text-[#5a5a5a] dark:text-[#b8b3a3] max-w-3xl mx-auto">
            Four simple steps to transform your documents into actionable learning paths
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, index) => (
            <div key={index} className="relative">
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-24 left-full w-full h-0.5 bg-gradient-to-r from-[#c09080] to-[#d4c4dc] -z-10" />
              )}
              <div className="bg-[#faf9f6] dark:bg-[#2d2d2d] rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-shadow h-full border border-[#e8e3d3] dark:border-[#4a4a4a]">
                <div className="text-6xl mb-4 text-center">{step.icon}</div>
                <div className="text-5xl font-bold bg-gradient-to-r from-[#c09080] to-[#d4c4dc] bg-clip-text text-transparent mb-4 text-center">
                  {step.number}
                </div>
                <h3 className="text-xl font-semibold text-[#2d2d2d] dark:text-[#e8e3d3] mb-3 text-center">
                  {step.title}
                </h3>
                <p className="text-[#5a5a5a] dark:text-[#888378] text-center">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
