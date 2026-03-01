"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { createClient } from "@/lib/supabase/client";

export default function UploadPage() {
  const router = useRouter();
  const supabase = createClient();
  const [files, setFiles] = useState([]);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [uploadErrors, setUploadErrors] = useState([]);
  const [uploadProgress, setUploadProgress] = useState({});
  const dropdownRef = useRef(null);
  
  const exampleCourses = [
    "Introduction to C Programming",
    "Machine Learning Fundamentals",
    "Web Development Bootcamp",
    "Data Structures and Algorithms",
    "Introduction to Psychology",
    "Advanced Algorithms",
    "Database Management Systems",
    "Software Engineering Principles",
    "Operating Systems"
  ];
  const [selectedCourse, setSelectedCourse] = useState(exampleCourses[0]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

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
    setUploadErrors([]);
    setUploadProgress({});

    const errors = [];

    for (const file of files) {
      // Sanitize the course name to be a safe folder name
      const folderName = selectedCourse.replace(/[^a-zA-Z0-9 _\-]/g, "").trim();
      const filePath = `${folderName}/${file.name}`;

      setUploadProgress((prev) => ({ ...prev, [file.name]: "uploading" }));

      const { error } = await supabase.storage
        .from("Courses")
        .upload(filePath, file, { upsert: true });

      if (error) {
        console.error(`Error uploading ${file.name}:`, error.message);
        errors.push(`${file.name}: ${error.message}`);
        setUploadProgress((prev) => ({ ...prev, [file.name]: "error" }));
      } else {
        setUploadProgress((prev) => ({ ...prev, [file.name]: "done" }));
      }
    }

    setUploading(false);

    if (errors.length > 0) {
      setUploadErrors(errors);
    } else {
      router.push("/dashboard");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#faf9f6] via-[#f4f1e8] to-[#e8e3d3] dark:from-[#1a1a1a] dark:via-[#2d2d2d] dark:to-[#3a3a3a]">
      <Header />
      
      <main className="pt-32 pb-20 px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-[#2d2d2d] dark:text-[#e8e3d3] mb-4">
              Upload Your Document
            </h1>
            <p className="text-xl text-[#5a5a5a] dark:text-[#b8b3a3]">
              Upload any document and let AI create your personalized learning roadmap
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">

            {/* Upload Errors */}
            {uploadErrors.length > 0 && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-xl p-4">
                <p className="text-sm font-semibold text-red-700 dark:text-red-400 mb-2">Some files failed to upload:</p>
                <ul className="list-disc list-inside space-y-1">
                  {uploadErrors.map((err, i) => (
                    <li key={i} className="text-sm text-red-600 dark:text-red-400">{err}</li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={() => setUploadErrors([])}
                  className="mt-3 text-xs text-red-600 dark:text-red-400 underline"
                >
                  Dismiss
                </button>
              </div>
            )}
            {/* File Upload Area */}
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className={`relative border-2 border-dashed rounded-2xl p-12 text-center transition-all ${
                dragActive
                  ? "border-[#c09080] bg-[#f5d5cb] dark:bg-[#5a4a45]"
                  : "border-[#e8e3d3] dark:border-[#4a4a4a] bg-[#faf9f6] dark:bg-[#2d2d2d]"
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
                      <div key={index} className="flex items-center justify-between p-3 bg-[#e8e3d3] dark:bg-[#3a3a3a] rounded-lg border border-[#d4c4dc] dark:border-[#4a4a4a]">
                        <div className="overflow-hidden mr-4">
                          <p className="text-sm font-medium text-[#2d2d2d] dark:text-[#e8e3d3] truncate">
                            {file.name}
                          </p>
                          <p className="text-xs text-[#5a5a5a] dark:text-[#b8b3a3]">
                            {(file.size / 1024 / 1024).toFixed(2)} MB
                            {uploadProgress[file.name] === "uploading" && <span className="ml-2 text-[#c09080]">Uploading…</span>}
                            {uploadProgress[file.name] === "done" && <span className="ml-2 text-green-600">✓ Uploaded</span>}
                            {uploadProgress[file.name] === "error" && <span className="ml-2 text-red-600">✗ Failed</span>}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeFile(index)}
                          disabled={uploading}
                          className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors disabled:opacity-40"
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
                      className="cursor-pointer text-sm text-[#c09080] hover:text-[#a87060] dark:hover:text-[#d4c4dc] font-semibold"
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
                      className="cursor-pointer text-[#c09080] hover:text-[#a87060] dark:hover:text-[#d4c4dc] font-semibold"
                    >
                      Click to upload
                    </label>
                    <span className="text-[#5a5a5a] dark:text-[#b8b3a3]"> or drag and drop</span>
                  </div>
                  <p className="text-sm text-[#5a5a5a] dark:text-[#b8b3a3]">
                    PDF, DOC, DOCX, PPT, PPTX, or TXT (max 50MB)
                  </p>
                </div>
              )}
            </div>

            {/* Course Selection */}
            <div className="bg-[#faf9f6] dark:bg-[#2d2d2d] rounded-2xl p-8 border border-[#e8e3d3] dark:border-[#4a4a4a] shadow-sm">
              <h2 className="text-2xl font-bold text-[#2d2d2d] dark:text-[#e8e3d3] mb-6">
                Select a Course
              </h2>
              
              <div className="space-y-6">
                {/* Custom Course Dropdown */}
                <div ref={dropdownRef} className="relative w-full">
                  <label className="block text-sm font-medium text-[#2d2d2d] dark:text-[#b8b3a3] mb-2">
                    Which course are these files for?
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="w-full flex items-center justify-between px-4 py-3 bg-[#f4f1e8] dark:bg-[#3a3a3a] border border-[#e8e3d3] dark:border-[#4a4a4a] rounded-xl text-left shadow-sm hover:bg-[#e8e3d3] dark:hover:bg-[#4a4a4a] transition-colors focus:outline-none focus:ring-2 focus:ring-[#c09080]"
                  >
                    <span className="block text-sm font-semibold text-[#2d2d2d] dark:text-[#e8e3d3]">
                      {selectedCourse}
                    </span>
                    <svg className={`shrink-0 w-5 h-5 text-[#5a5a5a] transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {isDropdownOpen && (
                    <div className="absolute z-10 w-full mt-2 bg-[#faf9f6] dark:bg-[#2d2d2d] border border-[#e8e3d3] dark:border-[#4a4a4a] rounded-xl shadow-lg max-h-60 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200 custom-scrollbar">
                      {exampleCourses.map((course) => (
                        <button
                          key={course}
                          type="button"
                          onClick={() => {
                            setSelectedCourse(course);
                            setIsDropdownOpen(false);
                          }}
                          className={`w-full text-left px-4 py-3 hover:bg-[#f4f1e8] dark:hover:bg-[#3a3a3a] transition-colors border-b last:border-0 border-[#e8e3d3] dark:border-[#4a4a4a] ${
                            selectedCourse === course 
                              ? 'bg-[#f5d5cb] dark:bg-[#5a4a45] text-[#c09080] dark:text-[#d4c4dc]' 
                              : 'text-[#2d2d2d] dark:text-[#e8e3d3]'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="block text-sm font-medium">
                              {course}
                            </span>
                            {selectedCourse === course && (
                              <svg className="shrink-0 w-4 h-4 text-[#c09080] dark:text-[#d4c4dc]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={files.length === 0 || uploading}
              className={`w-full py-4 rounded-full font-semibold text-lg transition-all ${
                files.length === 0 || uploading
                  ? "bg-[#e8e3d3] dark:bg-[#4a4a4a] text-[#8a8a8a] cursor-not-allowed"
                  : "bg-gradient-to-r from-[#c09080] to-[#d4c4dc] text-white hover:shadow-2xl hover:scale-105"
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
        </div>
      </main>

      <Footer />
    </div>
  );
}
