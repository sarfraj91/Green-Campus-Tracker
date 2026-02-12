import { Link } from "react-router-dom";
import { Leaf, Twitter, Instagram, Linkedin } from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-white border-t border-gray-200 mt-20">
      <div className="max-w-7xl mx-auto px-6 py-16">
        
        {/* Top Section */}
        <div className="grid md:grid-cols-4 gap-10">

          {/* Logo + Description */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Leaf className="text-emerald-600" size={26} />
              <span className="text-2xl font-bold text-emerald-600">
              GREEN CAMPUS TRACKER
              </span>
            </div>
            <p className="text-gray-600 leading-relaxed">
              Empowering individuals and organizations to offset their carbon
              footprint through transparent, trackable tree plantations globally.
            </p>
          </div>

          {/* Platform */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-4">Platform</h3>
            <ul className="space-y-3 text-gray-600">
              <li>
                <Link to="/dashboard" className="hover:text-emerald-600 transition">
                  Impact Dashboard
                </Link>
              </li>
              <li>
                <Link to="/plant" className="hover:text-emerald-600 transition">
                  Plant a Tree
                </Link>
              </li>
              <li>
                <Link to="/corporate" className="hover:text-emerald-600 transition">
                  Corporate Solutions
                </Link>
              </li>
              <li>
                <Link to="/gift" className="hover:text-emerald-600 transition">
                  Gift a Tree
                </Link>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-4">Company</h3>
            <ul className="space-y-3 text-gray-600">
              <li>
                <Link to="/about" className="hover:text-emerald-600 transition">
                  About Us
                </Link>
              </li>
              <li>
                <Link to="/mission" className="hover:text-emerald-600 transition">
                  Our Mission
                </Link>
              </li>
              <li>
                <Link to="/careers" className="hover:text-emerald-600 transition">
                  Careers
                </Link>
              </li>
              <li>
                <Link to="/contact" className="hover:text-emerald-600 transition">
                  Contact
                </Link>
              </li>
            </ul>
          </div>

          {/* Connect */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-4">Connect</h3>
            <div className="flex gap-4">
              <a
                href="#"
                className="w-10 h-10 flex items-center justify-center rounded-full border border-gray-300 hover:bg-emerald-100 hover:border-emerald-500 transition"
              >
                <Twitter size={18} />
              </a>

              <a
                href="#"
                className="w-10 h-10 flex items-center justify-center rounded-full border border-gray-300 hover:bg-emerald-100 hover:border-emerald-500 transition"
              >
                <Instagram size={18} />
              </a>

              <a
                href="#"
                className="w-10 h-10 flex items-center justify-center rounded-full border border-gray-300 hover:bg-emerald-100 hover:border-emerald-500 transition"
              >
                <Linkedin size={18} />
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="border-t border-gray-200 mt-12 pt-6 flex flex-col md:flex-row justify-between items-center text-gray-500 text-sm">
          <p>© 2026 Green Campus Tracker Initiative. All rights reserved.</p>
          <div className="flex gap-6 mt-4 md:mt-0">
            <Link to="/privacy" className="hover:text-emerald-600 transition">
              Privacy Policy
            </Link>
            <Link to="/terms" className="hover:text-emerald-600 transition">
              Terms of Service
            </Link>
          </div>
        </div>

      </div>
    </footer>
  );
};

export default Footer;
