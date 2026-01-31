import { Link } from 'react-router';
import { Menu, X } from 'lucide-react';
import { useState } from 'react';

export default function PrivacyPolicyPage() {
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
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">Privacy Policy</h1>
            <p className="text-sm md:text-base text-gray-600">Last Updated: January 27, 2026</p>
          </div>
          
          {/* Sections */}
          <div className="space-y-10 md:space-y-12">
            <section>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">1. Introduction</h2>
              <p className="text-base md:text-lg text-gray-700 leading-relaxed mb-4">
                PocketChef ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and safeguard your information when you use our mobile application.
              </p>
            </section>
            
            <section>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">2. Information We Collect</h2>
              <p className="text-base md:text-lg text-gray-700 leading-relaxed mb-4">We collect the following types of information:</p>
              
              <h3 className="text-xl md:text-2xl font-semibold text-gray-900 mt-6 mb-3">2.1 Personal Information</h3>
              <ul className="list-disc list-inside space-y-2 text-base md:text-lg text-gray-700 ml-4">
                <li><span className="text-orange-600 font-semibold">Name:</span> Used for account identification and personalization</li>
                <li><span className="text-orange-600 font-semibold">Email Address:</span> Used for account authentication and communication</li>
              </ul>
              
              <h3 className="text-xl md:text-2xl font-semibold text-gray-900 mt-6 mb-3">2.2 User Content</h3>
              <ul className="list-disc list-inside space-y-2 text-base md:text-lg text-gray-700 ml-4">
                <li><span className="text-orange-600 font-semibold">Photos/Videos:</span> Food photos you upload for recipe recognition and generation</li>
                <li><span className="text-orange-600 font-semibold">Audio Data:</span> Voice recordings for recipe suggestions</li>
                <li><span className="text-orange-600 font-semibold">Recipes, Preferences, and Meal Plans:</span> Content you create or save in the app</li>
              </ul>
              
              <h3 className="text-xl md:text-2xl font-semibold text-gray-900 mt-6 mb-3">2.3 Identifiers</h3>
              <ul className="list-disc list-inside space-y-2 text-base md:text-lg text-gray-700 ml-4">
                <li><span className="text-orange-600 font-semibold">User ID:</span> Unique identifier for your account</li>
                <li><span className="text-orange-600 font-semibold">Device ID:</span> Used for subscription management and app functionality</li>
              </ul>
              
              <h3 className="text-xl md:text-2xl font-semibold text-gray-900 mt-6 mb-3">2.4 Purchase Information</h3>
              <ul className="list-disc list-inside space-y-2 text-base md:text-lg text-gray-700 ml-4">
                <li><span className="text-orange-600 font-semibold">Purchase History:</span> Subscription and purchase data managed through RevenueCat</li>
              </ul>
              
              <h3 className="text-xl md:text-2xl font-semibold text-gray-900 mt-6 mb-3">2.5 Usage Data</h3>
              <ul className="list-disc list-inside space-y-2 text-base md:text-lg text-gray-700 ml-4">
                <li><span className="text-orange-600 font-semibold">Product Interaction:</span> How you interact with app features</li>
                <li><span className="text-orange-600 font-semibold">Other Usage Data:</span> General app usage patterns</li>
              </ul>
              
              <h3 className="text-xl md:text-2xl font-semibold text-gray-900 mt-6 mb-3">2.6 Diagnostics</h3>
              <ul className="list-disc list-inside space-y-2 text-base md:text-lg text-gray-700 ml-4">
                <li><span className="text-orange-600 font-semibold">Crash Data:</span> Information about app crashes for debugging</li>
                <li><span className="text-orange-600 font-semibold">Performance Data:</span> App performance metrics</li>
                <li><span className="text-orange-600 font-semibold">Other Diagnostic Data:</span> Additional diagnostic information</li>
              </ul>
            </section>
            
            <section>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">3. How We Use Your Information</h2>
              <p className="text-base md:text-lg text-gray-700 leading-relaxed mb-4">We use your information for the following purposes:</p>
              <ul className="list-disc list-inside space-y-2 text-base md:text-lg text-gray-700 ml-4">
                <li><span className="text-orange-600 font-semibold">App Functionality:</span> To provide core features including recipe generation, food recognition, voice suggestions, meal planning, and subscription management</li>
                <li><span className="text-orange-600 font-semibold">Product Personalization:</span> To customize recipes and meal plans based on your preferences</li>
                <li><span className="text-orange-600 font-semibold">Analytics:</span> To understand app usage and improve our services</li>
              </ul>
            </section>
            
            <section>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">4. Third-Party Services</h2>
              <p className="text-base md:text-lg text-gray-700 leading-relaxed mb-4">We use the following third-party services:</p>
              <ul className="list-disc list-inside space-y-2 text-base md:text-lg text-gray-700 ml-4">
                <li><span className="text-orange-600 font-semibold">OpenAI:</span> For AI-powered recipe generation, food recognition, and audio transcription</li>
                <li><span className="text-orange-600 font-semibold">Cloudinary:</span> For image storage and processing</li>
                <li><span className="text-orange-600 font-semibold">RevenueCat:</span> For subscription management and purchase verification</li>
                <li><span className="text-orange-600 font-semibold">Apple App Store:</span> For app distribution and in-app purchases</li>
              </ul>
            </section>
            
            <section>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">5. Data Storage and Security</h2>
              <p className="text-base md:text-lg text-gray-700 leading-relaxed">
                Your data is stored securely on our servers and with our third-party service providers. We implement appropriate security measures to protect your information from unauthorized access, alteration, disclosure, or destruction.
              </p>
            </section>
            
            <section>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">6. Data Retention</h2>
              <p className="text-base md:text-lg text-gray-700 leading-relaxed">
                We retain your personal information for as long as your account is active or as needed to provide you services. You may request deletion of your account and associated data at any time.
              </p>
            </section>
            
            <section>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">7. Your Rights</h2>
              <p className="text-base md:text-lg text-gray-700 leading-relaxed mb-4">You have the right to:</p>
              <ul className="list-disc list-inside space-y-2 text-base md:text-lg text-gray-700 ml-4">
                <li>Access your personal information</li>
                <li>Correct inaccurate information</li>
                <li>Delete your account and data</li>
                <li>Opt out of certain data collection (where applicable)</li>
              </ul>
            </section>
            
            <section>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">8. Children's Privacy</h2>
              <p className="text-base md:text-lg text-gray-700 leading-relaxed">
                Our app is not intended for children under 13 years of age. We do not knowingly collect personal information from children under 13.
              </p>
            </section>
            
            <section>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">9. Changes to This Privacy Policy</h2>
              <p className="text-base md:text-lg text-gray-700 leading-relaxed">
                We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last Updated" date.
              </p>
            </section>
            
            <section>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">10. Contact Us</h2>
              <p className="text-base md:text-lg text-gray-700 leading-relaxed mb-4">If you have questions about this Privacy Policy, please contact us:</p>
              <div className="bg-orange-50 border-l-4 border-orange-500 rounded-lg p-5 md:p-6 mt-6">
                <p className="text-base md:text-lg text-gray-900 mb-2"><strong>Email:</strong> rochapetoh@hotmail.com</p>
                <p className="text-base md:text-lg text-gray-900"><strong>App:</strong> PocketChef</p>
              </div>
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
