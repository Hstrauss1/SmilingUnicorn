export default function Features() {
  const features = [
    {
      icon: "🤖",
      title: "AI-Powered Analysis",
      description: "Advanced AI algorithms analyze your documents to identify key concepts, topics, and learning objectives automatically."
    },
    {
      icon: "🗺️",
      title: "Custom Roadmaps",
      description: "Generate personalized learning paths based on your skill level, goals, and the document content you provide."
    },
    {
      icon: "📚",
      title: "Multi-Format Support",
      description: "Upload PDFs, Word documents, presentations, and more. Our AI handles various document formats seamlessly."
    },
    {
      icon: "⚡",
      title: "Instant Processing",
      description: "Get your learning roadmap in seconds. Our optimized AI processes documents quickly without compromising quality."
    },
    {
      icon: "🎯",
      title: "Progress Tracking",
      description: "Monitor your learning journey with detailed progress tracking and milestone achievements."
    },
    {
      icon: "🔄",
      title: "Adaptive Learning",
      description: "Roadmaps adapt to your pace and understanding, ensuring optimal learning efficiency."
    },
    {
      icon: "💡",
      title: "Smart Recommendations",
      description: "Get intelligent suggestions for supplementary resources and related topics to enhance learning."
    },
    {
      icon: "🔒",
      title: "Secure & Private",
      description: "Your documents and learning data are encrypted and kept completely private and secure."
    }
  ];

  return (
    <section id="features" className="py-20 px-6 lg:px-8 bg-white dark:bg-gray-900">
      <div className="mx-auto max-w-7xl">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
            Powerful Features for Effective Learning
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
            Everything you need to transform documents into structured learning experiences
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="p-6 bg-gradient-to-br from-gray-50 to-white dark:from-gray-800 dark:to-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 hover:shadow-xl hover:scale-105 transition-all duration-300"
            >
              <div className="text-5xl mb-4">{feature.icon}</div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                {feature.title}
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
