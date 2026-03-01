import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-transparent text-[#b8b3a3] py-12 px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="border-t border-[#4a4a4a] pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-[#888378]">
            © 2026 Hudson Strauss, Raphael Kusuma, Johan Kou
          </p>
          <div className="flex gap-6">
            <a href="#" className="hover:text-[#e8e3d3] transition-colors">Twitter</a>
            <a href="#" className="hover:text-[#e8e3d3] transition-colors">LinkedIn</a>
            <a href="#" className="hover:text-[#e8e3d3] transition-colors">GitHub</a>
            <a href="#" className="hover:text-[#e8e3d3] transition-colors">Discord</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
