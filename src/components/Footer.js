import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-[#2d2d2d] text-[#b8b3a3] py-12 px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-[#c09080] to-[#d4c4dc] rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">LP</span>
              </div>
              <span className="text-xl font-bold text-[#e8e3d3]">LearnPath AI</span>
            </div>
            <p className="text-[#888378]">
              Transform your documents into personalized learning roadmaps with the power of AI.
            </p>
          </div>
          
          <div>
            <h3 className="font-semibold text-[#e8e3d3] mb-4">Product</h3>
            <ul className="space-y-2">
              <li><Link href="/#features" className="hover:text-[#e8e3d3] transition-colors">Features</Link></li>
              <li><Link href="/#how-it-works" className="hover:text-[#e8e3d3] transition-colors">How It Works</Link></li>
              <li><Link href="/upload" className="hover:text-[#e8e3d3] transition-colors">Upload Document</Link></li>
              <li><Link href="/dashboard" className="hover:text-[#e8e3d3] transition-colors">Dashboard</Link></li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-semibold text-[#e8e3d3] mb-4">Company</h3>
            <ul className="space-y-2">
              <li><Link href="/about" className="hover:text-[#e8e3d3] transition-colors">About Us</Link></li>
              <li><Link href="/blog" className="hover:text-[#e8e3d3] transition-colors">Blog</Link></li>
              <li><Link href="/careers" className="hover:text-[#e8e3d3] transition-colors">Careers</Link></li>
              <li><Link href="/contact" className="hover:text-[#e8e3d3] transition-colors">Contact</Link></li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-semibold text-[#e8e3d3] mb-4">Legal</h3>
            <ul className="space-y-2">
              <li><Link href="/privacy" className="hover:text-[#e8e3d3] transition-colors">Privacy Policy</Link></li>
              <li><Link href="/terms" className="hover:text-[#e8e3d3] transition-colors">Terms of Service</Link></li>
              <li><Link href="/cookies" className="hover:text-[#e8e3d3] transition-colors">Cookie Policy</Link></li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-[#4a4a4a] pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-[#888378]">
            © 2026 LearnPath AI. All rights reserved.
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
