export default function Features() {
  const features = [
    {
      icon: "🌍",
      title: "Free for Everyone",
      description: "No paywalls, no subscriptions. We believe quality education should be accessible to all, regardless of financial background."
    },
    {
      icon: "🗺️",
      title: "Custom Roadmaps",
      description: "Generate personalized learning paths based on your skill level, goals, and the document content you provide."
    },
    {
      icon: "♿",
      title: "Accessible Design",
      description: "Built with accessibility in mind. Screen reader support, keyboard navigation, and adaptive interfaces for all learners."
    },
    {
      icon: "⚡",
      title: "Instant Processing",
      description: "Get your learning roadmap in seconds. Our optimized AI processes documents quickly without compromising quality."
    },
    {
      icon: "�",
      title: "Multi-Language Support",
      description: "Learn in your native language. Our platform supports 50+ languages to break down language barriers."
    },
    {
      icon: "🔄",
      title: "Adaptive Learning",
      description: "Roadmaps adapt to your pace and understanding, ensuring optimal learning efficiency for diverse learning styles."
    },
    {
      icon: "�",
      title: "Learn Anywhere",
      description: "Access your learning materials on any device - desktop, tablet, or mobile. Education that fits your lifestyle."
    },
    {
      icon: "🤝",
      title: "Community Driven",
      description: "Join a global community of learners. Share resources, collaborate, and support each other's educational journey."
    }
  ];

  return (
    <section id="features" className="py-20 px-6 lg:px-8 bg-white dark:bg-gray-900">
      <div className="mx-auto max-w-7xl">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
            Education Without Barriers
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
            Empowering learners worldwide with free, accessible, and inclusive educational tools
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
