"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function UploadPage() {
  const router = useRouter();
  const [files, setFiles] = useState([]);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [learningGoal, setLearningGoal] = useState("");
  const [skillLevel, setSkillLevel] = useState("beginner");
  const [timeCommitment, setTimeCommitment] = useState("moderate");

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setFiles((prev) => [...prev, ...Array.from(e.dataTransfer.files)]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setFiles((prev) => [...prev, ...Array.from(e.target.files)]);
    }
  };

  const removeFile = (indexToRemove) => {
    setFiles(files.filter((_, index) => index !== indexToRemove));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (files.length === 0) return;

    setUploading(true);
    
    // Simulate upload and processing
    setTimeout(() => {
      setUploading(false);
      router.push("/dashboard");
    }, 3000);
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      <Header />
      
      <main className="pt-32 pb-20 px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
              Upload Your Document
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300">
              Upload any document and let AI create your personalized learning roadmap
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* File Upload Area */}
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className={`relative border-2 border-dashed rounded-2xl p-12 text-center transition-all ${
                dragActive
                  ? "border-blue-600 bg-blue-50 dark:bg-blue-900/20"
                  : "border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800"
              }`}
            >
              <input
                type="file"
                id="file-upload"
                onChange={handleFileChange}
                accept=".pdf,.doc,.docx,.ppt,.pptx,.txt"
                className="hidden"
                multiple
              />
              
              {files.length > 0 ? (
                <div className="space-y-4">
                  <div className="text-4xl mb-4">📄</div>
                  <div className="text-left max-w-md mx-auto space-y-3">
                    {files.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
                        <div className="overflow-hidden mr-4">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {file.name}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {(file.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeFile(index)}
                          className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="pt-4">
                    <label
                      htmlFor="file-upload"
                      className="cursor-pointer text-sm text-blue-600 hover:text-blue-700 font-semibold"
                    >
                      + Add more files
                    </label>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="text-6xl">📤</div>
                  <div>
                    <label
                      htmlFor="file-upload"
                      className="cursor-pointer text-blue-600 hover:text-blue-700 font-semibold"
                    >
                      Click to upload
                    </label>
                    <span className="text-gray-600 dark:text-gray-400"> or drag and drop</span>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    PDF, DOC, DOCX, PPT, PPTX, or TXT (max 50MB)
                  </p>
                </div>
              )}
            </div>

            {/* Learning Preferences */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 border border-gray-200 dark:border-gray-700">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                Customize Your Learning Path
              </h2>
              
              <div className="space-y-6">
                {/* Learning Goal */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    What&apos;s your learning goal?
                  </label>
                  <textarea
                    value={learningGoal}
                    onChange={(e) => setLearningGoal(e.target.value)}
                    placeholder="e.g., Master machine learning fundamentals for my upcoming project"
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    rows="3"
                  />
                </div>

              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={files.length === 0 || uploading}
              className={`w-full py-4 rounded-full font-semibold text-lg transition-all ${
                files.length === 0 || uploading
                  ? "bg-gray-300 dark:bg-gray-700 text-gray-500 cursor-not-allowed"
                  : "bg-linear-to-r from-blue-600 to-purple-600 text-white hover:shadow-2xl hover:scale-105"
              }`}
            >
              {uploading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Processing Your Document...
                </span>
              ) : (
                "Generate Learning Roadmap"
              )}
            </button>
          </form>

          {/* Info Cards */}
          <div className="mt-12 grid md:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
              <div className="text-3xl mb-3">⚡</div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Fast Processing</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Get your roadmap in seconds, not hours
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
              <div className="text-3xl mb-3">🔒</div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Secure & Private</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Your documents are encrypted and never shared
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
              <div className="text-3xl mb-3">🎯</div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Personalized</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Tailored to your goals and skill level
              </p>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
