"use client";
import Link from "next/link";
// import Toast from "./";
import { 
  TicketIcon,
  SparklesIcon,
  MapPinIcon,
  PhoneIcon,
  EnvelopeIcon,
  GlobeAltIcon,
  HeartIcon,
  ArrowUpIcon
} from '@heroicons/react/24/outline';
import { 
  FaFacebook, 
  // FaTwitter, 
  FaInstagram, 
  FaLinkedin, 
  FaYoutube 
} from 'react-icons/fa';

export default function Footer() {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="relative bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-10 left-10 w-32 h-32 bg-green-400 rounded-full animate-pulse"></div>
        <div className="absolute top-20 right-20 w-24 h-24 bg-blue-400 rounded-full animate-bounce"></div>
        <div className="absolute bottom-10 left-1/4 w-20 h-20 bg-purple-400 rounded-full animate-spin"></div>
        <div className="absolute bottom-20 right-1/3 w-28 h-28 bg-yellow-400 rounded-full animate-pulse"></div>
      </div>

      <div className="relative z-10">
        {/* Main Footer Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            
            {/* Brand Section */}
            <div className="lg:col-span-1">
              <Link href="/" className="flex items-center gap-3 group mb-6">
                <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-200 transform group-hover:scale-105">
                  <TicketIcon className="h-7 w-7 text-white" />
                </div>
                <span className="text-3xl font-bold tracking-tight bg-gradient-to-r from-green-400 to-green-300 bg-clip-text text-transparent">
                  Tikiti
                </span>
              </Link>
              <p className="text-gray-300 mb-6 leading-relaxed">
                The #1 ticket platform in South Africa. Discover amazing events, create unforgettable experiences, and connect with people who share your passions.
              </p>
              <div className="flex items-center gap-2 text-gray-400">
                <SparklesIcon className="h-5 w-5 text-yellow-400" />
                <span className="text-sm">Powered by <a href="https://funzile.com" target="_blank" className="text-green-400 hover:text-green-300 transition-all duration-200">Funzile</a></span>
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                <TicketIcon className="h-5 w-5 text-green-400" />
                Quick Links
              </h3>
              <ul className="space-y-3">
                <li>
                  <Link href="/" className="text-gray-300 hover:text-green-400 transition-all duration-200 flex items-center gap-2 group">
                    <div className="w-1 h-1 bg-green-400 rounded-full group-hover:scale-150 transition-transform duration-200"></div>
                    Home
                  </Link>
                </li>
                <li>
                  <Link href="/events" className="text-gray-300 hover:text-green-400 transition-all duration-200 flex items-center gap-2 group">
                    <div className="w-1 h-1 bg-green-400 rounded-full group-hover:scale-150 transition-transform duration-200"></div>
                    Browse Events
                  </Link>
                </li>
                <li>
                  <Link href="/dashboard/create-event" className="text-gray-300 hover:text-green-400 transition-all duration-200 flex items-center gap-2 group">
                    <div className="w-1 h-1 bg-green-400 rounded-full group-hover:scale-150 transition-transform duration-200"></div>
                    Create Event
                  </Link>
                </li>
                <li>
                  <Link href="/dashboard" className="text-gray-300 hover:text-green-400 transition-all duration-200 flex items-center gap-2 group">
                    <div className="w-1 h-1 bg-green-400 rounded-full group-hover:scale-150 transition-transform duration-200"></div>
                    Dashboard
                  </Link>
                </li>
                <li>
                  <Link href="/login" className="text-gray-300 hover:text-green-400 transition-all duration-200 flex items-center gap-2 group">
                    <div className="w-1 h-1 bg-green-400 rounded-full group-hover:scale-150 transition-transform duration-200"></div>
                    Sign In
                  </Link>
                </li>
              </ul>
            </div>

            {/* Support */}
            <div>
              <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                <HeartIcon className="h-5 w-5 text-green-400" />
                Support
              </h3>
              <ul className="space-y-3">
                <li>
                  <Link href="/help" className="text-gray-300 hover:text-green-400 transition-all duration-200 flex items-center gap-2 group">
                    <div className="w-1 h-1 bg-green-400 rounded-full group-hover:scale-150 transition-transform duration-200"></div>
                    Help Center
                  </Link>
                </li>
                <li>
                  <Link href="/contact" className="text-gray-300 hover:text-green-400 transition-all duration-200 flex items-center gap-2 group">
                    <div className="w-1 h-1 bg-green-400 rounded-full group-hover:scale-150 transition-transform duration-200"></div>
                    Contact Us
                  </Link>
                </li>
                <li>
                  <Link href="/faq" className="text-gray-300 hover:text-green-400 transition-all duration-200 flex items-center gap-2 group">
                    <div className="w-1 h-1 bg-green-400 rounded-full group-hover:scale-150 transition-transform duration-200"></div>
                    FAQ
                  </Link>
                </li>
                <li>
                  <Link href="/privacy" className="text-gray-300 hover:text-green-400 transition-all duration-200 flex items-center gap-2 group">
                    <div className="w-1 h-1 bg-green-400 rounded-full group-hover:scale-150 transition-transform duration-200"></div>
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link href="/terms" className="text-gray-300 hover:text-green-400 transition-all duration-200 flex items-center gap-2 group">
                    <div className="w-1 h-1 bg-green-400 rounded-full group-hover:scale-150 transition-transform duration-200"></div>
                    Terms of Service
                  </Link>
                </li>
              </ul>
            </div>

            {/* Contact Info */}
            <div>
              <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                <GlobeAltIcon className="h-5 w-5 text-green-400" />
                Contact Info
              </h3>
              <div className="space-y-4">
                <div className="flex items-center gap-3 text-gray-300">
                  <MapPinIcon className="h-5 w-5 text-green-400 flex-shrink-0" />
                  <span className="text-sm">Durban, South Africa</span>
                </div>
                <div className="flex items-center gap-3 text-gray-300">
                  <PhoneIcon className="h-5 w-5 text-green-400 flex-shrink-0" />
                  <span className="text-sm">+27 61 069 2364</span>
                </div>
                <div className="flex items-center gap-3 text-gray-300">
                  <EnvelopeIcon className="h-5 w-5 text-green-400 flex-shrink-0" />
                  <span className="text-sm">sbonelo.mkhize@funzile.com</span>
                </div>
              </div>

              {/* Social Media */}
              <div className="mt-6">
                <h4 className="text-white font-semibold mb-3">Follow Us</h4>
                <div className="flex items-center gap-3">
                  <a href="https://www.facebook.com/tiikiitii" target="_blank" className="bg-gray-800 hover:bg-green-600 p-2 rounded-lg transition-all duration-200 transform hover:scale-110">
                    <FaFacebook className="h-5 w-5" />
                  </a>
                  {/* <a href="#" className="bg-gray-800 hover:bg-green-600 p-2 rounded-lg transition-all duration-200 transform hover:scale-110">
                    <FaTwitter className="h-5 w-5" />
                  </a> */}
                  <a href="https://www.instagram.com/tikiti_fun" className="bg-gray-800 hover:bg-green-600 p-2 rounded-lg transition-all duration-200 transform hover:scale-110">
                    <FaInstagram className="h-5 w-5" />
                  </a>
                  <a href="www.linkedin.com/in/sbonelo-mkhize-d" className="bg-gray-800 hover:bg-green-600 p-2 rounded-lg transition-all duration-200 transform hover:scale-110">
                    <FaLinkedin className="h-5 w-5" />
                  </a>
                  <a href="https://www.youtube.com/@tikiti_fun" className="bg-gray-800 hover:bg-green-600 p-2 rounded-lg transition-all duration-200 transform hover:scale-110">
                    <FaYoutube className="h-5 w-5" />
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Newsletter Signup */}
          <div className="mt-12 pt-8 border-t border-gray-700">
            <div className="max-w-2xl mx-auto text-center">
              <h3 className="text-2xl font-bold text-white mb-4">Stay Updated</h3>
              <p className="text-gray-300 mb-6">
                Get the latest updates on events, exclusive offers, and platform features delivered to your inbox.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
                {/* <form onSubmit={(e) => {e.preventDefault()}} action="https://formspree.io/f/mrgvvqel"
                method="POST"> */}
                  <input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    className="flex-1 px-4 py-3 bg-gray-800 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 border border-gray-700 placeholder-gray-400"
                  />
                  <button type="submit" className="bg-gradient-to-r from-green-500 to-green-600 text-white px-6 py-3 rounded-xl font-semibold hover:from-green-600 hover:to-green-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105">
                    Subscribe
                  </button>
                {/* </form> */}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-700 bg-gray-900/50 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4 text-sm text-gray-400">
                <span>&copy; {new Date().getFullYear()} Tikiti. All rights reserved.</span>
                <span className="hidden md:inline">•</span>
                <span className="hidden md:inline">Made with ❤️ by <a href="https://funzile.com" target="_blank" className="text-green-400 hover:text-green-300 transition-all duration-200">Funzile</a></span>
              </div>
              
              <div className="flex items-center gap-4">
                <button
                  onClick={scrollToTop}
                  className="bg-gradient-to-r from-green-500 to-green-600 text-white p-3 rounded-xl hover:from-green-600 hover:to-green-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
                  aria-label="Scroll to top"
                >
                  <ArrowUpIcon className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
} 