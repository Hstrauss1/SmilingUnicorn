export default function Testimonials() {
  const testimonials = [
    {
      name: "Sarah Chen",
      role: "Computer Science Student",
      image: "👩‍💻",
      content: "LearnPath AI helped me master machine learning concepts in half the time. The personalized roadmap was exactly what I needed!",
      rating: 5
    },
    {
      name: "Marcus Johnson",
      role: "Self-Taught Developer",
      image: "👨‍💼",
      content: "I uploaded a 300-page programming book and got a structured learning path in seconds. This tool is a game-changer for self-learners.",
      rating: 5
    },
    {
      name: "Elena Rodriguez",
      role: "Medical Student",
      image: "👩‍⚕️",
      content: "Studying for exams has never been easier. The AI breaks down complex medical texts into manageable learning modules.",
      rating: 5
    },
    {
      name: "David Kim",
      role: "Product Manager",
      image: "👨‍💻",
      content: "I use this to quickly understand new industry reports and technical documentation. It saves me hours every week.",
      rating: 5
    }
  ];

  return (
    <section className="py-20 px-6 lg:px-8 bg-white dark:bg-gray-900">
      <div className="mx-auto max-w-7xl">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
            Loved by Learners Worldwide
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
            Join thousands of students and professionals who are learning smarter with AI
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {testimonials.map((testimonial, index) => (
            <div
              key={index}
              className="bg-gradient-to-br from-gray-50 to-white dark:from-gray-800 dark:to-gray-900 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-shadow"
            >
              <div className="flex items-center gap-1 mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <span key={i} className="text-yellow-400 text-xl">★</span>
                ))}
              </div>
              <p className="text-gray-700 dark:text-gray-300 mb-6 italic">
                "{testimonial.content}"
              </p>
              <div className="flex items-center gap-3">
                <div className="text-4xl">{testimonial.image}</div>
                <div>
                  <div className="font-semibold text-gray-900 dark:text-white">
                    {testimonial.name}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {testimonial.role}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
