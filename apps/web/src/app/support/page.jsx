import { Link } from 'react-router';
import { Menu, X } from 'lucide-react';
import { useState } from 'react';

export default function SupportPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const appStoreLink = "#";

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      {/* Fixed Floating Navigation */}
      <nav className="fixed top-3 md:top-6 left-1/2 transform -translate-x-1/2 z-50 px-3 md:px-6 py-1.5 rounded-full flex items-center gap-2 md:gap-8 w-[95%] md:w-auto max-w-7xl" style={{
        backgroundColor: 'rgba(255, 255, 255, 0.5)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        border: '1px solid rgba(0, 0, 0, 0.1)',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(255, 255, 255, 0.5) inset'
      }}>
        <Link to="/" className="flex items-center gap-2">
          <div className="w-6 h-6 md:w-8 md:h-8 bg-orange-50 rounded-lg flex items-center justify-center">
            <img 
              src="/assets/images/icon.png" 
              alt="PocketChef" 
              className="w-4 h-4 md:w-5 md:h-5"
            />
          </div>
          <span className="font-bold text-base md:text-lg text-gray-900">PocketChef</span>
        </Link>
        {/* Desktop Navigation */}
        <div className="hidden md:flex gap-6">
          <Link to="/#features" className="text-gray-600 hover:text-gray-900 transition-colors text-sm font-medium">
            Features
          </Link>
          <Link to="/#reviews" className="text-gray-600 hover:text-gray-900 transition-colors text-sm font-medium">
            Reviews
          </Link>
          <Link to="/#pricing" className="text-gray-600 hover:text-gray-900 transition-colors text-sm font-medium">
            Pricing
          </Link>
        </div>
        {/* Mobile Menu Button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden ml-auto p-2 text-gray-600 hover:text-gray-900"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
        {/* Desktop Download Button */}
        <a
          href={appStoreLink}
          className="hidden md:flex bg-gray-900 text-white h-10 px-5 rounded-full text-sm font-semibold hover:bg-gray-800 transition-colors items-center justify-center whitespace-nowrap"
        >
          Download
        </a>
      </nav>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="fixed top-16 left-1/2 transform -translate-x-1/2 z-40 rounded-2xl w-[90%] max-w-sm p-4 md:hidden" style={{
          backgroundColor: 'rgba(255, 255, 255, 0.5)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          border: '1px solid rgba(0, 0, 0, 0.1)',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(255, 255, 255, 0.5) inset'
        }}>
          <div className="flex flex-col gap-3">
            <Link 
              to="/#features" 
              className="text-gray-600 hover:text-gray-900 transition-colors text-sm font-medium py-2"
              onClick={() => setMobileMenuOpen(false)}
            >
              Features
            </Link>
            <Link 
              to="/#reviews" 
              className="text-gray-600 hover:text-gray-900 transition-colors text-sm font-medium py-2"
              onClick={() => setMobileMenuOpen(false)}
            >
              Reviews
            </Link>
            <Link 
              to="/#pricing" 
              className="text-gray-600 hover:text-gray-900 transition-colors text-sm font-medium py-2"
              onClick={() => setMobileMenuOpen(false)}
            >
              Pricing
            </Link>
            <a
              href={appStoreLink}
              className="bg-gray-900 text-white h-10 px-5 rounded-full text-sm font-semibold hover:bg-gray-800 transition-colors flex items-center justify-center whitespace-nowrap mt-2"
              onClick={() => setMobileMenuOpen(false)}
            >
              Download
            </a>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="pt-24 md:pt-32 pb-12 md:pb-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 md:px-10">
          {/* Header */}
          <div className="text-center mb-12 md:mb-16 pb-8 border-b border-gray-200">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">Support</h1>
          </div>
          
          {/* Sections */}
          <div className="space-y-10 md:space-y-12">
            <section>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">Need Help?</h2>
              <p className="text-base md:text-lg text-gray-700 leading-relaxed">
                We're here to help! If you have any questions, issues, or feedback about PocketChef, please don't hesitate to reach out.
              </p>
            </section>
            
            <section>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">Contact Us</h2>
              <div className="bg-orange-50 border-l-4 border-orange-500 rounded-lg p-5 md:p-6 mt-6">
                <p className="text-base md:text-lg text-gray-900 mb-2">
                  <strong>Email:</strong>{' '}
                  <a href="mailto:rochapetoh@hotmail.com?subject=PocketChef%20Support%20Request" className="text-orange-600 hover:text-orange-700 font-semibold">
                    rochapetoh@hotmail.com
                  </a>
                </p>
                <p className="text-base md:text-lg text-gray-900">
                  <strong>App:</strong> PocketChef
                </p>
              </div>
            </section>
            
            <section>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">Common Questions</h2>
              
              <h3 className="text-xl md:text-2xl font-semibold text-gray-900 mt-6 mb-3">Subscription & Billing</h3>
              <p className="text-base md:text-lg text-gray-700 leading-relaxed">
                For subscription management, billing questions, or to cancel your subscription, please use the subscription management options in your device's App Store settings.
              </p>
              
              <h3 className="text-xl md:text-2xl font-semibold text-gray-900 mt-6 mb-3">Account Issues</h3>
              <p className="text-base md:text-lg text-gray-700 leading-relaxed">
                If you're experiencing issues with your account, password reset, or login problems, please contact us via email with your account email address.
              </p>
              
              <h3 className="text-xl md:text-2xl font-semibold text-gray-900 mt-6 mb-3">Feature Requests & Feedback</h3>
              <p className="text-base md:text-lg text-gray-700 leading-relaxed">
                We love hearing from our users! If you have suggestions for new features or feedback about the app, please email us.
              </p>
            </section>
            
            <section>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">Response Time</h2>
              <p className="text-base md:text-lg text-gray-700 leading-relaxed">
                We aim to respond to all support inquiries within 24-48 hours. For urgent issues, please include "URGENT" in your email subject line.
              </p>
            </section>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="pb-8 md:pb-10 bg-white border-t border-gray-200" style={{ paddingTop: '40px' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-10">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-gray-900 rounded-md flex items-center justify-center">
                <img 
                  src="/assets/images/icon.png" 
                  alt="PocketChef" 
                  className="w-4 h-4"
                />
              </div>
              <span className="font-bold text-base">PocketChef</span>
            </div>
            <div className="flex flex-wrap justify-center gap-4 md:gap-8 text-sm font-medium text-gray-500">
              <Link to="/privacy" className="hover:text-gray-900 transition-colors">
                Privacy Policy
              </Link>
              <Link to="/terms" className="hover:text-gray-900 transition-colors">
                Terms of Service
              </Link>
              <Link to="/support" className="hover:text-gray-900 transition-colors">
                Support
              </Link>
            </div>
            <div className="text-sm text-gray-500">
              © 2026 PocketChef Inc.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
