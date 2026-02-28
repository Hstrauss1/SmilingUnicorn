"use client";

import { useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState("roadmap");

  // Mock data for demonstration
  const roadmapData = {
    title: "Machine Learning Fundamentals",
    document: "ml-textbook.pdf",
    progress: 35,
    modules: [
      {
        id: 1,
        title: "Introduction to Machine Learning",
        status: "completed",
        duration: "2 hours",
        topics: ["What is ML?", "Types of ML", "Applications"],
        progress: 100
      },
      {
        id: 2,
        title: "Data Preprocessing",
        status: "in-progress",
        duration: "3 hours",
        topics: ["Data Cleaning", "Feature Scaling", "Data Transformation"],
        progress: 60
      },
      {
        id: 3,
        title: "Supervised Learning",
        status: "locked",
        duration: "5 hours",
        topics: ["Linear Regression", "Classification", "Model Evaluation"],
        progress: 0
      },
      {
        id: 4,
        title: "Unsupervised Learning",
        status: "locked",
        duration: "4 hours",
        topics: ["Clustering", "Dimensionality Reduction", "Anomaly Detection"],
        progress: 0
      },
      {
        id: 5,
        title: "Neural Networks",
        status: "locked",
        duration: "6 hours",
        topics: ["Perceptrons", "Backpropagation", "Deep Learning Basics"],
        progress: 0
      }
    ]
  };

  const recentActivity = [
    { action: "Completed", item: "Introduction to Machine Learning", time: "2 hours ago" },
    { action: "Started", item: "Data Preprocessing module", time: "1 day ago" },
    { action: "Uploaded", item: "ml-textbook.pdf", time: "3 days ago" }
  ];

  const stats = [
    { label: "Total Progress", value: "35%", icon: "📊" },
    { label: "Hours Learned", value: "12h", icon: "⏱️" },
    { label: "Modules Completed", value: "1/5", icon: "✅" },
    { label: "Current Streak", value: "3 days", icon: "🔥" }
  ];

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      <Header />
      
      <main className="pt-32 pb-20 px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
              My Learning Dashboard
            </h1>
            <p className="text-gray-600 dark:text-gray-300">
              Track your progress and continue your learning journey
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid md:grid-cols-4 gap-6 mb-8">
            {stats.map((stat, index) => (
              <div
                key={index}
                className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-3xl">{stat.icon}</span>
                  <span className="text-2xl font-bold text-gray-900 dark:text-white">
                    {stat.value}
                  </span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">{stat.label}</p>
              </div>
            ))}
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Roadmap Card */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                        {roadmapData.title}
                      </h2>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        From: {roadmapData.document}
                      </p>
                    </div>
                    <Link
                      href="/upload"
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      New Roadmap
                    </Link>
                  </div>
                  
                  {/* Overall Progress */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-700 dark:text-gray-300">Overall Progress</span>
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {roadmapData.progress}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                      <div
                        className="bg-linear-to-r from-blue-600 to-purple-600 h-3 rounded-full transition-all"
                        style={{ width: `${roadmapData.progress}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Modules List */}
                <div className="p-6 space-y-4">
                  {roadmapData.modules.map((module) => (
                    <div
                      key={module.id}
                      className={`p-4 rounded-xl border-2 transition-all ${
                        module.status === "completed"
                          ? "border-green-500 bg-green-50 dark:bg-green-900/20"
                          : module.status === "in-progress"
                          ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                          : "border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/20 opacity-60"
                      }`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="text-2xl">
                              {module.status === "completed" ? "✅" : module.status === "in-progress" ? "🔄" : "🔒"}
                            </span>
                            <h3 className="font-semibold text-gray-900 dark:text-white">
                              {module.title}
                            </h3>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                            Duration: {module.duration}
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {module.topics.map((topic, idx) => (
                              <span
                                key={idx}
                                className="px-2 py-1 bg-white dark:bg-gray-800 rounded-lg text-xs text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700"
                              >
                                {topic}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                      
                      {module.status !== "locked" && (
                        <div className="mt-3">
                          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${
                                module.status === "completed" ? "bg-green-500" : "bg-blue-500"
                              }`}
                              style={{ width: `${module.progress}%` }}
                            />
                          </div>
                        </div>
                      )}
                      
                      <div className="mt-3">
                        <button
                          disabled={module.status === "locked"}
                          className={`w-full py-2 rounded-lg font-medium transition-colors ${
                            module.status === "locked"
                              ? "bg-gray-300 dark:bg-gray-700 text-gray-500 cursor-not-allowed"
                              : module.status === "completed"
                              ? "bg-green-600 text-white hover:bg-green-700"
                              : "bg-blue-600 text-white hover:bg-blue-700"
                          }`}
                        >
                          {module.status === "completed" ? "Review" : module.status === "in-progress" ? "Continue" : "Locked"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Recent Activity */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                  Recent Activity
                </h3>
                <div className="space-y-4">
                  {recentActivity.map((activity, index) => (
                    <div key={index} className="flex gap-3">
                      <div className="w-2 h-2 bg-blue-600 rounded-full mt-2" />
                      <div className="flex-1">
                        <p className="text-sm text-gray-900 dark:text-white">
                          <span className="font-semibold">{activity.action}</span> {activity.item}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {activity.time}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                  Quick Actions
                </h3>
                <div className="space-y-3">
                  <Link
                    href="/upload"
                    className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                  >
                    <span className="text-2xl">📤</span>
                    <span className="font-medium text-gray-900 dark:text-white">Upload New Document</span>
                  </Link>
                  <button className="w-full flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900/20 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-900/30 transition-colors">
                    <span className="text-2xl">📊</span>
                    <span className="font-medium text-gray-900 dark:text-white">View Analytics</span>
                  </button>
                  <button className="w-full flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900/20 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-900/30 transition-colors">
                    <span className="text-2xl">⚙️</span>
                    <span className="font-medium text-gray-900 dark:text-white">Settings</span>
                  </button>
                </div>
              </div>

              {/* Tips */}
              <div className="bg-linear-to-br from-blue-100 to-purple-100 dark:from-blue-900/20 dark:to-purple-900/20 rounded-2xl p-6 border border-blue-200 dark:border-blue-800">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                  💡 Learning Tip
                </h3>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  Consistent daily practice is more effective than long, irregular study sessions. Try to maintain your streak!
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
