import { Link } from 'react-router';
import { Menu, X } from 'lucide-react';
import { useState } from 'react';

export default function TermsOfUsePage() {
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
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">Terms of Use</h1>
            <p className="text-sm md:text-base text-gray-600">Last Updated: January 27, 2026</p>
          </div>
          
          {/* Sections */}
          <div className="space-y-10 md:space-y-12">
            <section>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">1. Acceptance of Terms</h2>
              <p className="text-base md:text-lg text-gray-700 leading-relaxed">
                By downloading, installing, or using PocketChef ("the App"), you agree to be bound by these Terms of Use ("Terms"). If you do not agree to these Terms, do not use the App.
              </p>
            </section>
            
            <section>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">2. Description of Service</h2>
              <p className="text-base md:text-lg text-gray-700 leading-relaxed">
                PocketChef is a mobile application that provides recipe suggestions, food recognition, meal planning, and grocery list generation services. The App uses artificial intelligence to generate personalized recipe recommendations based on your preferences and input.
              </p>
            </section>
            
            <section>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">3. Subscription Services</h2>
              
              <h3 className="text-xl md:text-2xl font-semibold text-gray-900 mt-6 mb-3">3.1 Auto-Renewable Subscriptions</h3>
              <p className="text-base md:text-lg text-gray-700 leading-relaxed mb-4">PocketChef offers premium subscription services ("PocketChef Premium") with the following options:</p>
              <ul className="list-disc list-inside space-y-2 text-base md:text-lg text-gray-700 ml-4">
                <li><span className="text-orange-600 font-semibold">Monthly Subscription:</span> Automatically renews every month until cancelled</li>
                <li><span className="text-orange-600 font-semibold">Yearly Subscription:</span> Automatically renews every year until cancelled</li>
              </ul>
              
              <h3 className="text-xl md:text-2xl font-semibold text-gray-900 mt-6 mb-3">3.2 Subscription Terms</h3>
              <ul className="list-disc list-inside space-y-2 text-base md:text-lg text-gray-700 ml-4">
                <li>Subscriptions automatically renew unless auto-renew is turned off at least 24 hours before the end of the current period</li>
                <li>Your account will be charged for renewal within 24 hours prior to the end of the current period</li>
                <li>You can manage and cancel your subscriptions by going to your account settings in the App Store after purchase</li>
                <li>Any unused portion of a free trial period, if offered, will be forfeited when you purchase a subscription</li>
              </ul>
              
              <h3 className="text-xl md:text-2xl font-semibold text-gray-900 mt-6 mb-3">3.3 Pricing</h3>
              <p className="text-base md:text-lg text-gray-700 leading-relaxed">
                Subscription prices are displayed in the App and may vary by region. Prices are subject to change with notice. Current pricing is available in the App's subscription section.
              </p>
              
              <h3 className="text-xl md:text-2xl font-semibold text-gray-900 mt-6 mb-3">3.4 Cancellation</h3>
              <p className="text-base md:text-lg text-gray-700 leading-relaxed">
                You may cancel your subscription at any time through your device's subscription management settings. Cancellation will take effect at the end of the current billing period, and you will continue to have access to premium features until that time.
              </p>
            </section>
            
            <section>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">4. User Accounts</h2>
              <ul className="list-disc list-inside space-y-2 text-base md:text-lg text-gray-700 ml-4">
                <li>You are responsible for maintaining the confidentiality of your account credentials</li>
                <li>You are responsible for all activities that occur under your account</li>
                <li>You must notify us immediately of any unauthorized use of your account</li>
                <li>We reserve the right to suspend or terminate accounts that violate these Terms</li>
              </ul>
            </section>
            
            <section>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">5. User Content</h2>
              <p className="text-base md:text-lg text-gray-700 leading-relaxed mb-4">
                You retain ownership of any content you create, upload, or share through the App ("User Content"). By using the App, you grant us a license to:
              </p>
              <ul className="list-disc list-inside space-y-2 text-base md:text-lg text-gray-700 ml-4">
                <li>Store and process your User Content to provide the App's services</li>
                <li>Use your User Content to improve our services and AI models</li>
                <li>Display your User Content within the App</li>
              </ul>
              <p className="text-base md:text-lg text-gray-700 leading-relaxed mt-4">
                You represent and warrant that you have all necessary rights to grant this license and that your User Content does not violate any third-party rights or applicable laws.
              </p>
            </section>
            
            <section>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">6. Acceptable Use</h2>
              <p className="text-base md:text-lg text-gray-700 leading-relaxed mb-4">You agree not to:</p>
              <ul className="list-disc list-inside space-y-2 text-base md:text-lg text-gray-700 ml-4">
                <li>Use the App for any illegal purpose or in violation of any laws</li>
                <li>Upload malicious code, viruses, or harmful content</li>
                <li>Attempt to reverse engineer, decompile, or disassemble the App</li>
                <li>Interfere with or disrupt the App's services or servers</li>
                <li>Use automated systems to access the App without permission</li>
                <li>Impersonate any person or entity or misrepresent your affiliation</li>
              </ul>
            </section>
            
            <section>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">7. Intellectual Property</h2>
              <p className="text-base md:text-lg text-gray-700 leading-relaxed">
                The App, including its design, features, and content (excluding User Content), is owned by PocketChef and protected by copyright, trademark, and other intellectual property laws. You may not copy, modify, distribute, or create derivative works based on the App without our express written permission.
              </p>
            </section>
            
            <section>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">8. AI-Generated Content</h2>
              <p className="text-base md:text-lg text-gray-700 leading-relaxed mb-4">The App uses artificial intelligence to generate recipes and suggestions. While we strive for accuracy, AI-generated content may contain errors or inaccuracies. You acknowledge that:</p>
              <ul className="list-disc list-inside space-y-2 text-base md:text-lg text-gray-700 ml-4">
                <li>AI-generated recipes are suggestions and should be reviewed before use</li>
                <li>You are responsible for verifying ingredient safety and allergen information</li>
                <li>We are not liable for any issues arising from following AI-generated recipes</li>
              </ul>
            </section>
            
            <section>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">9. Disclaimers</h2>
              <p className="text-base md:text-lg text-gray-700 leading-relaxed mb-4">
                THE APP IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED. WE DISCLAIM ALL WARRANTIES, INCLUDING BUT NOT LIMITED TO MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
              </p>
              <p className="text-base md:text-lg text-gray-700 leading-relaxed">
                We do not guarantee that the App will be uninterrupted, error-free, or secure. Recipe suggestions are provided for informational purposes only and should not replace professional dietary advice.
              </p>
            </section>
            
            <section>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">10. Limitation of Liability</h2>
              <p className="text-base md:text-lg text-gray-700 leading-relaxed">
                TO THE MAXIMUM EXTENT PERMITTED BY LAW, WE SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING LOSS OF PROFITS, DATA, OR USE, ARISING OUT OF OR RELATED TO YOUR USE OF THE APP.
              </p>
            </section>
            
            <section>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">11. Indemnification</h2>
              <p className="text-base md:text-lg text-gray-700 leading-relaxed">
                You agree to indemnify and hold harmless PocketChef, its officers, directors, employees, and agents from any claims, damages, losses, liabilities, and expenses (including legal fees) arising out of your use of the App or violation of these Terms.
              </p>
            </section>
            
            <section>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">12. Changes to Terms</h2>
              <p className="text-base md:text-lg text-gray-700 leading-relaxed">
                We reserve the right to modify these Terms at any time. We will notify you of material changes by posting the updated Terms in the App or by other reasonable means. Your continued use of the App after such changes constitutes acceptance of the modified Terms.
              </p>
            </section>
            
            <section>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">13. Termination</h2>
              <p className="text-base md:text-lg text-gray-700 leading-relaxed">
                We may terminate or suspend your access to the App at any time, with or without cause or notice, for any reason, including violation of these Terms. Upon termination, your right to use the App will immediately cease.
              </p>
            </section>
            
            <section>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">14. Governing Law</h2>
              <p className="text-base md:text-lg text-gray-700 leading-relaxed">
                These Terms shall be governed by and construed in accordance with the laws of the United States, without regard to its conflict of law provisions.
              </p>
            </section>
            
            <section>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">15. Contact Information</h2>
              <p className="text-base md:text-lg text-gray-700 leading-relaxed mb-4">If you have questions about these Terms, please contact us:</p>
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
