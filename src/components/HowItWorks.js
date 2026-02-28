export default function HowItWorks() {
  const steps = [
    {
      number: "01",
      title: "Upload Your Document",
      description: "Simply drag and drop or select your document. We support PDF, Word, PowerPoint, and text files.",
      icon: "📤"
    },
    {
      number: "02",
      title: "AI Analyzes Content",
      description: "Our advanced AI engine processes your document, identifying key concepts, topics, and learning objectives.",
      icon: "🧠"
    },
    {
      number: "03",
      title: "Customize Your Path",
      description: "Set your learning goals, current skill level, and time commitment to personalize your roadmap.",
      icon: "⚙️"
    },
    {
      number: "04",
      title: "Start Learning",
      description: "Follow your personalized roadmap, track progress, and achieve your learning goals efficiently.",
      icon: "🚀"
    }
  ];

  return (
    <section id="how-it-works" className="py-20 px-6 lg:px-8 bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      <div className="mx-auto max-w-7xl">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
            How It Works
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
            Four simple steps to transform your documents into actionable learning paths
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, index) => (
            <div key={index} className="relative">
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-24 left-full w-full h-0.5 bg-gradient-to-r from-blue-600 to-purple-600 -z-10" />
              )}
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-shadow h-full border border-gray-200 dark:border-gray-700">
                <div className="text-6xl mb-4 text-center">{step.icon}</div>
                <div className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4 text-center">
                  {step.number}
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3 text-center">
                  {step.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-center">
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
