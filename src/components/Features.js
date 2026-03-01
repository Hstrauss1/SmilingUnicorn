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
      description: "Generate personalized learning paths based on the document content you provide."
    },
    {
      icon: "♿",
      title: "Accessible Design",
      description: "Built with accessibility in mind. Multilingual discussion support for learners of all backgrounds."
    },
    {
      icon: "⚡",
      title: "Quick Processing",
      description: "Get your learning roadmap quickly. Our AI engine processes documents without compromising quality."
    },
  ];

  return (
    <section id="features" className="py-20 px-6 lg:px-8 bg-[#faf9f6] dark:bg-[#1a1a1a]">
      <div className="mx-auto max-w-7xl">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-[#2d2d2d] dark:text-[#e8e3d3] mb-4">
            Education Without Barriers
          </h2>
          <p className="text-xl text-[#5a5a5a] dark:text-[#b8b3a3] max-w-3xl mx-auto">
            Empowering learners worldwide with free, accessible, and inclusive educational tools
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="p-6 bg-gradient-to-br from-[#f4f1e8] to-[#faf9f6] dark:from-[#2d2d2d] dark:to-[#3a3a3a] rounded-2xl border border-[#e8e3d3] dark:border-[#4a4a4a] hover:shadow-xl hover:scale-105 transition-all duration-300"
            >
              <div className="text-5xl mb-4">{feature.icon}</div>
              <h3 className="text-xl font-semibold text-[#2d2d2d] dark:text-[#e8e3d3] mb-2">
                {feature.title}
              </h3>
              <p className="text-[#5a5a5a] dark:text-[#888378]">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
