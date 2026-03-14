import { Link } from 'react-router';
import { useState, useEffect } from 'react';
import { ChefHat, Sparkles, PlayCircle, Camera, ScanLine, Mic, Calendar, MonitorSmartphone, Star, Clock, Flame, User, Bookmark, ChevronRight, Menu, X, Check, ShoppingCart, Heart, Search, Utensils } from 'lucide-react';

export default function Home() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  // Initialize with fallback packages so prices show immediately
  const [packages, setPackages] = useState([
    {
      identifier: 'monthly',
      product: {
        identifier: 'premium_monthly',
        priceString: '$4.99',
        price: 4.99,
      }
    },
    {
      identifier: 'yearly',
      product: {
        identifier: 'premium_yearly',
        priceString: '$49.99',
        price: 49.99,
      }
    }
  ]);
  const [isLoadingPrices, setIsLoadingPrices] = useState(false);
  
  const appStoreLink = "https://apps.apple.com/us/app/pocketchef-meal-planner/id6757957197";

  // Fetch packages from API
  useEffect(() => {
    async function fetchPackages() {
      try {
        const response = await fetch('/api/subscriptions/packages');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        if (data.success && data.packages) {
          setPackages(data.packages);
        } else {
          // Fallback if response format is unexpected
          throw new Error('Invalid response format');
        }
      } catch (error) {
        console.error('Error fetching packages:', error);
        // Set fallback packages on error
        setPackages([
          {
            identifier: 'monthly',
            product: {
              identifier: 'premium_monthly',
              priceString: '$4.99',
              price: 4.99,
            }
          },
          {
            identifier: 'yearly',
            product: {
              identifier: 'premium_yearly',
              priceString: '$49.99',
              price: 49.99,
            }
          }
        ]);
      } finally {
        setIsLoadingPrices(false);
      }
    }
    fetchPackages();
  }, []);

  const monthlyPackage = packages?.find(pkg => 
    pkg.identifier === 'monthly' || 
    pkg.product?.identifier?.toLowerCase().includes('monthly')
  );
  const yearlyPackage = packages?.find(pkg => 
    pkg.identifier === 'yearly' || 
    pkg.product?.identifier?.toLowerCase().includes('yearly')
  );

  // Calculate savings - use fallback values if packages not loaded
  const monthlyPrice = monthlyPackage?.product?.price || 4.99;
  const yearlyPrice = yearlyPackage?.product?.price || 49.99;
  const yearlyMonthlyEquivalent = yearlyPrice / 12;
  const savings = monthlyPrice > 0 ? Math.round(((monthlyPrice - yearlyMonthlyEquivalent) / monthlyPrice * 100)) : 17;
  
  // Get price strings with fallbacks
  const monthlyPriceString = monthlyPackage?.product?.priceString || '$4.99';
  const yearlyPriceString = yearlyPackage?.product?.priceString || '$49.99';

  // Apple Logo SVG Component
  const AppleIcon = ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
    </svg>
  );

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
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 md:w-8 md:h-8 bg-orange-50 rounded-lg flex items-center justify-center">
            <img 
              src="/assets/images/icon.png" 
              alt="PocketChef" 
              className="w-4 h-4 md:w-5 md:h-5"
            />
          </div>
          <span className="font-bold text-base md:text-lg text-gray-900">PocketChef</span>
        </div>
        {/* Desktop Navigation */}
        <div className="hidden md:flex gap-6">
          <a href="#features" className="text-gray-600 hover:text-gray-900 transition-colors text-sm font-medium">
            Features
          </a>
          <a href="#pricing" className="text-gray-600 hover:text-gray-900 transition-colors text-sm font-medium">
            Pricing
          </a>
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
            <a 
              href="#features" 
              className="text-gray-600 hover:text-gray-900 transition-colors text-sm font-medium py-2"
              onClick={() => setMobileMenuOpen(false)}
            >
              Features
            </a>
            <a 
              href="#pricing" 
              className="text-gray-600 hover:text-gray-900 transition-colors text-sm font-medium py-2"
              onClick={() => setMobileMenuOpen(false)}
            >
              Pricing
            </a>
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

      {/* Hero Section */}
      <header className="pt-24 md:pt-40 pb-12 md:pb-20 min-h-screen flex items-center">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-10 w-full">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-20 items-center">
            {/* Left: Text Content */}
            <div>
              <div className="inline-flex items-center gap-1.5 bg-green-50 text-green-700 px-3 py-1.5 rounded-full text-xs font-semibold mb-4 md:mb-6">
                <Sparkles className="w-3.5 h-3.5" />
                AI-Powered Chef Assistant
              </div>
              <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold text-gray-900 mb-4 md:mb-6 leading-tight tracking-tight">
                Cooking made <br />
                <span className="text-orange-600">effortless.</span>
              </h1>
              <p className="text-base sm:text-lg md:text-xl text-gray-600 mb-6 md:mb-10 max-w-lg leading-relaxed">
                Stop worrying about what to cook. Snap a photo of your fridge, speak your cravings, or browse personalized daily picks.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 md:gap-4 mb-8 md:mb-12">
                <a
                  href={appStoreLink}
                  className="bg-gray-900 text-white px-6 md:px-7 rounded-full font-semibold hover:bg-gray-800 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                  style={{ height: '52px' }}
                >
                  <AppleIcon className="w-5 h-5" />
                  Get for iOS
                </a>
                <a
                  href="#how-it-works"
                  className="bg-orange-50 text-orange-900 px-6 md:px-7 rounded-full font-semibold hover:bg-orange-100 transition-all flex items-center justify-center gap-2"
                  style={{ height: '52px' }}
                >
                  <PlayCircle className="w-5 h-5" />
                  How it works
                </a>
              </div>

            </div>

            {/* Right: Visual Content */}
            <div className="relative flex flex-col items-center justify-center mt-8 md:mt-0">
              {/* Hero Image */}
              <div className="relative w-full h-[350px] sm:h-[450px] md:h-[600px] lg:h-[700px]">
                <div className="w-full h-full rounded-2xl md:rounded-3xl overflow-hidden relative shadow-2xl">
                  <img
                    src="https://storage.googleapis.com/banani-generated-images/generated-images/0179aeac-650f-453b-8ae7-1d063a83d0bc.jpg"
                    alt="Fresh ingredients on table"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                </div>

                {/* Desktop-only floating cards */}
                <div className="hidden md:block">
                  {/* Floating Card 1: Ingredients Detected - Top Left */}
                  <div className="absolute top-20 -left-8 bg-white rounded-lg p-2.5 shadow-xl flex items-center gap-2 animate-float-strong border border-black/[0.05] z-10">
                    <div className="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center flex-shrink-0">
                      <ScanLine className="w-4 h-4 text-green-600" />
                    </div>
                    <div>
                      <div className="font-bold text-xs text-green-900">Ingredients detected</div>
                      <div className="text-[10px] text-gray-600">Red bell pepper, garlic, thyme</div>
                    </div>
                  </div>

                  {/* Floating Card 2: Voice Input - Top Right */}
                  <div className="absolute top-10 -right-8 bg-white rounded-lg p-2.5 shadow-xl animate-float-strong border border-black/[0.05] z-10" style={{ animationDelay: '1.2s' }}>
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="w-8 h-8 bg-gray-900 rounded-full flex items-center justify-center flex-shrink-0">
                        <Mic className="w-3.5 h-3.5 text-white" />
                      </div>
                      <div className="flex-1">
                        <div className="text-[10px] text-gray-600 mb-1.5">"I'm tired, want something quick"</div>
                        <div className="flex gap-1 flex-wrap">
                          <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 rounded-full font-semibold text-gray-700">15‑min stir fry</span>
                          <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 rounded-full font-semibold text-gray-700">Garlic butter pasta</span>
                          <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 rounded-full font-semibold text-gray-700">One‑pan chicken</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Floating Card 3: Grocery List - Mid Right */}
                  <div className="absolute top-64 -right-16 bg-white rounded-lg p-2.5 shadow-xl animate-float-strong border border-black/[0.05] z-10" style={{ animationDelay: '2.4s' }}>
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="w-6 h-6 bg-green-50 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Check className="w-3 h-3 text-green-600" />
                      </div>
                      <div className="flex-1">
                        <div className="text-xs font-semibold text-gray-900 mb-1">Grocery list ready</div>
                        <div className="flex gap-1 flex-wrap mb-1">
                          <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 rounded-full text-gray-700">Tomatoes</span>
                          <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 rounded-full text-gray-700">Fresh basil</span>
                          <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 rounded-full text-gray-700">Mozzarella</span>
                        </div>
                        <div className="text-[10px] text-gray-500">Auto‑generated from your meal plan</div>
                      </div>
                    </div>
                  </div>

                  {/* Floating Card 4: Photo → Recipe - Bottom Left */}
                  <div className="absolute bottom-32 -left-10 bg-white rounded-lg p-3 shadow-xl animate-float-strong border border-black/[0.05] z-10" style={{ animationDelay: '0.6s' }}>
                    <div className="flex items-center gap-2.5">
                      <div className="w-12 h-12 bg-gray-900 rounded-xl p-0.5 flex items-center justify-center flex-shrink-0 shadow-md">
                        <div className="w-full h-full rounded-lg overflow-hidden relative">
                          <img
                            src="https://storage.googleapis.com/banani-generated-images/generated-images/fbefc29f-4913-461e-bde4-e8c8cfa947a6.jpg"
                            alt="Pepperoni Pizza"
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-1 border border-white/60 rounded"></div>
                        </div>
                      </div>
                      <div className="flex-1 min-w-0 pr-1">
                        <div className="inline-flex items-center px-1.5 py-0.5 bg-cyan-50 border border-cyan-200 rounded-full mb-0.5">
                          <span className="text-[9px] font-bold text-cyan-700">Photo → Recipe</span>
                        </div>
                        <div className="font-bold text-xs text-gray-900 mb-0.5">Pepperoni Pizza</div>
                        <div className="text-[10px] text-gray-600">Identified from your photo · 95% match</div>
                      </div>
                      <div className="w-6 h-6 bg-gray-900 rounded-full flex items-center justify-center flex-shrink-0">
                        <ChevronRight className="w-3 h-3 text-white" />
                      </div>
                    </div>
                  </div>

                  {/* Floating Card 5: Search Recipes - Bottom Right */}
                  <div className="absolute bottom-10 -right-2 bg-white rounded-lg p-2.5 shadow-xl animate-float-strong border border-blue-100 z-10" style={{ animationDelay: '1.8s', background: 'linear-gradient(135deg, #f9fafb, #eef2ff)' }}>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="text-[10px] font-semibold text-gray-700">Search recipes</div>
                        <div className="text-[9px] font-semibold text-indigo-600 px-1.5 py-0.5 bg-indigo-50 rounded-full">by name</div>
                      </div>
                      <div className="bg-white rounded-full px-2 py-1.5 flex items-center gap-1.5 border border-gray-200 shadow-sm">
                        <Search className="w-3 h-3 text-gray-500" />
                        <span className="text-[10px] text-gray-600 truncate">"creamy tomato pasta"</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Mobile-only feature cards — infinite marquee */}
              <div className="md:hidden mt-6 w-full overflow-hidden">
                <div className="animate-marquee flex gap-3">
                  {[...Array(2)].map((_, setIndex) => (
                    <div key={setIndex} className="flex gap-3 flex-shrink-0">
                      <div className="bg-white rounded-xl p-3 shadow-md border border-black/[0.05] flex items-center gap-2.5 flex-shrink-0" style={{ width: '180px' }}>
                        <div className="w-9 h-9 bg-green-50 rounded-lg flex items-center justify-center flex-shrink-0">
                          <ScanLine className="w-4 h-4 text-green-600" />
                        </div>
                        <div>
                          <div className="font-bold text-xs text-green-900">Scan Ingredients</div>
                          <div className="text-[10px] text-gray-600">Detect from photo</div>
                        </div>
                      </div>

                      <div className="bg-white rounded-xl p-3 shadow-md border border-black/[0.05] flex items-center gap-2.5 flex-shrink-0" style={{ width: '180px' }}>
                        <div className="w-9 h-9 bg-gray-900 rounded-full flex items-center justify-center flex-shrink-0">
                          <Mic className="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <div className="font-bold text-xs text-gray-900">Voice Search</div>
                          <div className="text-[10px] text-gray-600">Speak your cravings</div>
                        </div>
                      </div>

                      <div className="bg-white rounded-xl p-3 shadow-md border border-black/[0.05] flex items-center gap-2.5 flex-shrink-0" style={{ width: '180px' }}>
                        <div className="w-9 h-9 bg-cyan-50 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Camera className="w-4 h-4 text-cyan-600" />
                        </div>
                        <div>
                          <div className="font-bold text-xs text-gray-900">Photo → Recipe</div>
                          <div className="text-[10px] text-gray-600">Snap any dish</div>
                        </div>
                      </div>

                      <div className="bg-white rounded-xl p-3 shadow-md border border-black/[0.05] flex items-center gap-2.5 flex-shrink-0" style={{ width: '180px' }}>
                        <div className="w-9 h-9 bg-green-50 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Check className="w-4 h-4 text-green-600" />
                        </div>
                        <div>
                          <div className="font-bold text-xs text-gray-900">Grocery Lists</div>
                          <div className="text-[10px] text-gray-600">Auto from meal plan</div>
                        </div>
                      </div>

                      <div className="bg-white rounded-xl p-3 shadow-md border border-black/[0.05] flex items-center gap-2.5 flex-shrink-0" style={{ width: '180px' }}>
                        <div className="w-9 h-9 bg-indigo-50 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Search className="w-4 h-4 text-indigo-600" />
                        </div>
                        <div>
                          <div className="font-bold text-xs text-gray-900">Search Recipes</div>
                          <div className="text-[10px] text-gray-600">Find by name</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Features Section */}
      <section id="features" className="bg-gray-50 py-12 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-10">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 md:mb-16">
            <div className="mb-4 md:mb-0">
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-4 leading-tight">
                Everything you need <br className="hidden md:block" />to cook with confidence.
              </h2>
              <p className="text-base md:text-lg text-gray-600 max-w-md">
                Advanced AI tools designed to simplify your kitchen experience from planning to plate.
              </p>
            </div>
          </div>

          {/* Bento Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6" style={{ gridTemplateRows: 'auto' }}>
            {/* Snap & Cook - Wide Card */}
            <div className="md:col-span-2 bg-orange-50 rounded-2xl md:rounded-3xl p-6 md:p-8 relative overflow-hidden border border-black/[0.03] hover:-translate-y-1 transition-all hover:shadow-lg">
              <div className="flex flex-col md:flex-row justify-between items-start relative z-10 gap-4">
                <div>
                  <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm mb-4">
                    <Camera className="w-5 h-5 text-orange-600" />
                  </div>
                  <h3 className="text-xl md:text-2xl font-semibold text-gray-900 mb-3">Snap & Cook</h3>
                  <p className="text-sm md:text-base text-gray-600 max-w-sm">
                    Identify ingredients instantly. Our vision AI recognizes items with 95% accuracy and suggests recipes immediately.
                  </p>
                </div>
                <div className="px-4 py-2 bg-white rounded-full text-xs font-semibold shadow-sm flex items-center gap-1.5 self-start">
                  <ScanLine className="w-3.5 h-3.5 text-green-600" />
                  Scanning active
                </div>
              </div>
              <div className="mt-6 md:mt-8 bg-white rounded-xl md:rounded-2xl overflow-hidden relative border border-black/[0.05]" style={{ height: '180px' }}>
                <img
                  src="https://storage.googleapis.com/banani-generated-images/generated-images/cef69782-f564-42ff-986c-d513d10676e4.jpg"
                  alt="Vegetables"
                  className="w-full h-full object-cover opacity-90"
                />
                {/* Detection Overlay */}
                <div className="absolute border-2 border-white rounded-lg shadow-lg flex items-start justify-center" style={{ top: '30%', left: '20%', width: '60px', height: '60px', boxShadow: '0 0 0 2px rgba(16, 185, 129, 0.5)' }}>
                  <div className="bg-green-600 text-white text-xs font-bold px-1.5 py-0.5 rounded mt-[-12px]">
                    Tomato
                  </div>
                </div>
                <div className="absolute border-2 border-dashed border-white/80 rounded-lg" style={{ top: '40%', left: '55%', width: '80px', height: '70px' }}></div>
              </div>
            </div>

            {/* Voice Feature - Tall Card */}
            <div className="md:row-span-2 rounded-2xl md:rounded-3xl p-6 md:p-8 flex flex-col border-2 border-orange-200 bg-gradient-to-br from-white via-orange-50 to-orange-100">
              <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center mb-6">
                <Mic className="w-6 h-6 text-orange-600" />
              </div>
              <h3 className="text-xl md:text-2xl font-semibold text-gray-900 mb-6">Just say the word</h3>
              <p className="text-sm md:text-base text-gray-600 mb-8 flex-1">
                "I want something spicy for dinner."<br /><br />
                The Vibe feature understands context, mood, and dietary needs instantly.
              </p>
              {/* Voice Waveform - Animated */}
              <div className="flex items-center justify-center gap-1.5 mt-auto" style={{ height: '120px' }}>
                {[...Array(6)].map((_, i) => (
                  <div
                    key={i}
                    className="bg-orange-500 rounded animate-waveform"
                    style={{
                      width: '6px',
                      height: `${[24, 48, 32, 64, 40, 24][i]}px`,
                      opacity: [0.5, 1, 0.8, 1, 0.8, 0.5][i],
                      animationDelay: `${i * 0.15}s`,
                      boxShadow: i === 3 ? '0 0 20px rgba(249, 115, 22, 0.5)' : 'none',
                      background: `linear-gradient(to bottom, #fb923c, #ea580c)`,
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Meal Planning */}
            <div className="bg-gray-100 rounded-2xl md:rounded-3xl p-6 md:p-8 border border-black/[0.03] hover:-translate-y-1 transition-all hover:shadow-lg">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center">
                  <Calendar className="w-4.5 h-4.5 text-blue-600" />
                </div>
                <h3 className="text-lg md:text-xl font-semibold text-gray-900">Meal Planning</h3>
              </div>
              <p className="text-sm text-gray-600 mb-5">Plan your weekly meals with AI-powered suggestions.</p>
              <div className="flex flex-col gap-3">
                <div className="bg-white p-2.5 rounded-lg flex items-center gap-3 border border-gray-200 shadow-sm">
                  <div className="w-8 h-8 bg-yellow-100 rounded-md flex items-center justify-center text-lg">
                    🍳
                  </div>
                  <div className="text-xs font-semibold">Breakfast Plan</div>
                </div>
                <div className="bg-white p-2.5 rounded-lg flex items-center gap-3 border border-gray-200 opacity-70">
                  <div className="w-8 h-8 bg-green-100 rounded-md flex items-center justify-center text-lg">
                    🥗
                  </div>
                  <div className="text-xs font-semibold">Weekly Schedule</div>
                </div>
              </div>
            </div>

            {/* Step-by-step Cooking Mode */}
            <div className="bg-gray-100 rounded-2xl md:rounded-3xl p-6 md:p-8 border border-black/[0.03] hover:-translate-y-1 transition-all hover:shadow-lg">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 bg-purple-50 rounded-lg flex items-center justify-center">
                  <MonitorSmartphone className="w-4.5 h-4.5 text-purple-600" />
                </div>
                <h3 className="text-lg md:text-xl font-semibold text-gray-900">Step-by-step Cooking</h3>
              </div>
              <p className="text-sm text-gray-600 mb-5">Follow recipes step-by-step with timers and ingredient checklists.</p>
              <div className="w-full rounded-xl overflow-hidden relative" style={{ height: '120px' }}>
                <img
                  src="https://storage.googleapis.com/banani-generated-images/generated-images/ba3d280a-6f4f-41a5-b85b-cdcaa80ed075.jpg"
                  alt="Woman using iPad in kitchen"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section - Horizontal Layout */}
      <section id="how-it-works" className="py-12 md:py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-10">
          <div className="flex flex-col items-center text-center mb-8 md:mb-12">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-4">How it works</h2>
            <p className="text-base md:text-lg text-gray-600 max-w-2xl">
              From discovering recipes to cooking your meal, PocketChef guides you through every step.
            </p>
          </div>

          {/* Horizontal Steps Container */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
            {/* Step 1: Discover & Decide */}
            <div className="bg-white rounded-xl md:rounded-2xl p-4 md:p-5 border border-gray-200 shadow-sm hover:shadow-md transition-all flex flex-col">
              {/* Step Badge */}
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs md:text-sm font-semibold text-teal-600">STEP 1</span>
                <div className="flex-1 h-px bg-teal-200"></div>
              </div>
              
              {/* Title */}
              <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-2">Discover & Decide</h3>
              
              {/* Description */}
              <p className="text-xs md:text-sm text-gray-600 mb-4 flex-1">
                Snap a photo of your fridge, scan a dish, search by name, or speak your cravings. Our AI identifies ingredients instantly and suggests personalized recipes.
              </p>
              
              {/* Feature Badges */}
              <div className="flex flex-wrap gap-2 mb-4">
                <span className="text-xs px-2 py-1 bg-teal-50 text-teal-700 rounded-full flex items-center gap-1">
                  <span>👁️</span> 95% Accuracy
                </span>
                <span className="text-xs px-2 py-1 bg-teal-50 text-teal-700 rounded-full flex items-center gap-1">
                  <span>💭</span> Mood-based
                </span>
              </div>
              
              {/* Visual Element - Compact */}
              <div className="w-full h-32 md:h-40 rounded-lg overflow-hidden bg-gray-100 relative">
                <img
                  src="https://storage.googleapis.com/banani-generated-images/generated-images/cef69782-f564-42ff-986c-d513d10676e4.jpg"
                  alt="Discover recipes"
                  className="w-full h-full object-cover"
                />
                {/* Overlay Icons */}
                <div className="absolute inset-0 flex items-center justify-center gap-3">
                  <div className="w-8 h-8 bg-gray-800/80 rounded-full flex items-center justify-center">
                    <Camera className="w-4 h-4 text-white" />
                  </div>
                  <div className="w-8 h-8 bg-gray-600/80 rounded-full flex items-center justify-center">
                    <Mic className="w-4 h-4 text-white" />
                  </div>
                </div>
              </div>
            </div>

            {/* Step 2: Plan Your Week */}
            <div className="bg-white rounded-xl md:rounded-2xl p-4 md:p-5 border border-gray-200 shadow-sm hover:shadow-md transition-all flex flex-col">
              {/* Step Badge */}
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs md:text-sm font-semibold text-teal-600">STEP 2</span>
                <div className="flex-1 h-px bg-teal-200"></div>
              </div>
              
              {/* Title */}
              <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-2">Plan Your Week</h3>
              
              {/* Description */}
              <p className="text-xs md:text-sm text-gray-600 mb-4 flex-1">
                Add personalized recipe suggestions to your weekly calendar. We automatically balance nutrition and variety.
              </p>
              
              {/* Visual Element - Meal Plan Card */}
              <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-gray-900">Meal Plan</span>
                  <Calendar className="w-3.5 h-3.5 text-gray-500" />
                </div>
                <div className="space-y-2">
                  <div className="bg-yellow-50 rounded p-2">
                    <div className="text-xs font-medium text-gray-900">Mon • Avocado Toast</div>
                    <div className="text-xs text-gray-500">Breakfast • 10m</div>
                  </div>
                  <div className="bg-green-50 rounded p-2">
                    <div className="text-xs font-medium text-gray-900">Tue • Chicken Salad</div>
                    <div className="text-xs text-gray-500">Lunch • 15m</div>
                  </div>
                  <div className="bg-pink-50 rounded p-2">
                    <div className="text-xs font-medium text-gray-900">Wed • Tomato Pasta</div>
                    <div className="text-xs text-gray-500">Dinner • 25m</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 3: Shop Smart */}
            <div className="bg-white rounded-xl md:rounded-2xl p-4 md:p-5 border border-gray-200 shadow-sm hover:shadow-md transition-all flex flex-col">
              {/* Step Badge */}
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs md:text-sm font-semibold text-teal-600">STEP 3</span>
                <div className="flex-1 h-px bg-teal-200"></div>
              </div>
              
              {/* Title */}
              <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-2">Shop Smart</h3>
              
              {/* Description */}
              <p className="text-xs md:text-sm text-gray-600 mb-4 flex-1">
                Turn your meal plan into an organized grocery list. Items automatically sorted by aisle for faster shopping.
              </p>
              
              {/* Category Tags */}
              <div className="flex flex-wrap gap-2 mb-4">
                <span className="text-xs px-2.5 py-1 bg-teal-600 text-white rounded-full">Produce</span>
                <span className="text-xs px-2.5 py-1 bg-gray-200 text-gray-700 rounded-full">Dairy</span>
                <span className="text-xs px-2.5 py-1 bg-gray-200 text-gray-700 rounded-full">Spices</span>
              </div>
              
              {/* Visual Element - Shopping List Card */}
              <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-gray-900">Shopping List</span>
                </div>
                <div className="space-y-2">
                  <div>
                    <div className="text-xs font-semibold text-gray-700 mb-1">PRODUCE</div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <div className="w-3.5 h-3.5 border border-gray-300 rounded"></div>
                        <span className="text-xs text-gray-700">2 lbs Tomatoes</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-green-600" />
                        <span className="text-xs text-gray-700 line-through">Fresh Basil</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3.5 h-3.5 border border-gray-300 rounded"></div>
                        <span className="text-xs text-gray-700">1 bag Spinach</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-gray-700 mb-1">PANTRY</div>
                    <div className="flex items-center gap-2">
                      <div className="w-3.5 h-3.5 border border-gray-300 rounded"></div>
                      <span className="text-xs text-gray-700">Olive Oil</span>
                    </div>
                  </div>
                  <div className="mt-2 pt-2 border-t border-gray-200">
                    <div className="flex items-center gap-1.5">
                      <Check className="w-3 h-3 text-green-600" />
                      <span className="text-xs text-gray-500">Synced</span>
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">Sent to partner</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 4: Cook with Guidance */}
            <div className="bg-white rounded-xl md:rounded-2xl p-4 md:p-5 border border-gray-200 shadow-sm hover:shadow-md transition-all flex flex-col">
              {/* Step Badge */}
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs md:text-sm font-semibold text-teal-600">STEP 4</span>
                <div className="flex-1 h-px bg-teal-200"></div>
              </div>
              
              {/* Title */}
              <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-2">Cook with Guidance</h3>
              
              {/* Description */}
              <p className="text-xs md:text-sm text-gray-600 mb-4 flex-1">
                Follow recipes step-by-step with interactive timers and ingredient checklists. Never miss a step.
              </p>
              
              {/* Visual Element */}
              <div className="w-full h-32 md:h-40 rounded-lg overflow-hidden bg-gray-100">
                <img
                  src="https://storage.googleapis.com/banani-generated-images/generated-images/ba3d280a-6f4f-41a5-b85b-cdcaa80ed075.jpg"
                  alt="Step-by-step cooking"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            {/* Step 5: Save & Organize */}
            <div className="bg-white rounded-xl md:rounded-2xl p-4 md:p-5 border border-gray-200 shadow-sm hover:shadow-md transition-all flex flex-col">
              {/* Step Badge */}
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs md:text-sm font-semibold text-teal-600">STEP 5</span>
                <div className="flex-1 h-px bg-teal-200"></div>
              </div>
              
              {/* Title */}
              <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-2">Save & Organize</h3>
              
              {/* Description */}
              <p className="text-xs md:text-sm text-gray-600 mb-4 flex-1">
                Save favorites to collections, create custom recipes, and build your personal cookbook.
              </p>
              
              {/* Visual Element - Collections */}
              <div className="space-y-2">
                <div className="bg-orange-50 rounded-lg p-3 border border-orange-100">
                  <div className="flex items-center gap-2">
                    <ChefHat className="w-4 h-4 text-orange-600" />
                    <div>
                      <div className="text-xs font-semibold text-gray-900">My Recipes</div>
                      <div className="text-xs text-gray-500">Create & manage</div>
                    </div>
                  </div>
                </div>
                <div className="bg-red-50 rounded-lg p-3 border border-red-100">
                  <div className="flex items-center gap-2">
                    <Heart className="w-4 h-4 text-red-600" />
                    <div>
                      <div className="text-xs font-semibold text-gray-900">Favorites</div>
                      <div className="text-xs text-gray-500">Saved recipes</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section - Before Pricing */}
      <section className="py-16 md:py-24 bg-gradient-to-br from-orange-50 via-orange-50 to-orange-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 md:px-10 text-center">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Ready to transform your cooking?
          </h2>
          <p className="text-base md:text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
            Join thousands of home cooks who are discovering new recipes, planning meals, and cooking with confidence every day.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href={appStoreLink}
              className="bg-gray-900 text-white px-8 md:px-10 py-4 rounded-full font-semibold hover:bg-gray-800 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
              style={{ height: '56px' }}
            >
              <AppleIcon className="w-5 h-5" />
              Download for iOS
            </a>
            <a
              href="#pricing"
              className="bg-white text-gray-900 px-8 md:px-10 py-4 rounded-full font-semibold hover:bg-gray-50 transition-all border-2 border-gray-200 shadow-md hover:shadow-lg flex items-center justify-center gap-2"
              style={{ height: '56px' }}
            >
              View Pricing
            </a>
          </div>
        </div>
      </section>


      {/* Pricing Section */}
      <section id="pricing" className="py-12 md:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-10">
          <div className="flex flex-col items-center text-center mb-8 md:mb-16">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-4">Simple, transparent pricing</h2>
            <p className="text-base md:text-lg text-gray-600 max-w-lg">
              Choose the plan that works best for you. Cancel anytime.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 max-w-4xl mx-auto">
            {/* Monthly Plan */}
            <div className="bg-white border-2 border-gray-200 rounded-2xl md:rounded-3xl p-6 md:p-8 hover:border-orange-500 transition-all">
              <div className="mb-6">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Monthly</h3>
                {isLoadingPrices ? (
                  <div className="h-16 flex items-center justify-center">
                    <div className="animate-pulse bg-gray-200 h-12 w-32 rounded"></div>
                  </div>
                ) : (
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl md:text-5xl font-bold text-gray-900">
                      {monthlyPriceString}
                    </span>
                    <span className="text-gray-600">/month</span>
                  </div>
                )}
              </div>
              <ul className="space-y-3 mb-6">
                {[
                  "Unlimited voice suggestions (Vibe feature)",
                  "Unlimited food recognition (photo scan)",
                  "Unlimited ingredients to recipes",
                  "Unlimited recipe generation"
                ].map((feature, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-sm md:text-base text-gray-600">{feature}</span>
                  </li>
                ))}
              </ul>
              <a
                href={appStoreLink}
                className="block w-full bg-gray-900 text-white text-center py-3 md:py-4 rounded-xl font-semibold hover:bg-gray-800 transition-colors"
              >
                Get Started
              </a>
            </div>

            {/* Yearly Plan - Featured */}
            <div className="bg-orange-50 border-2 border-orange-500 rounded-2xl md:rounded-3xl p-6 md:p-8 relative hover:shadow-lg transition-all">
              <div className="absolute top-4 right-4 bg-orange-500 text-white px-3 py-1 rounded-full text-xs font-bold">
                BEST VALUE
              </div>
              <div className="mb-6">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Yearly</h3>
                {isLoadingPrices ? (
                  <div className="h-16 flex items-center justify-center">
                    <div className="animate-pulse bg-gray-200 h-12 w-32 rounded"></div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl md:text-5xl font-bold text-gray-900">
                        {yearlyPriceString}
                      </span>
                      <span className="text-gray-600">/year</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-2">
                      Save {savings}% vs monthly
                    </p>
                  </>
                )}
              </div>
              <ul className="space-y-3 mb-6">
                {[
                  "Everything in Monthly",
                  `${savings}% savings vs monthly`,
                  "Annual commitment",
                  "Early access to new features"
                ].map((feature, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-sm md:text-base text-gray-600">{feature}</span>
                  </li>
                ))}
              </ul>
              <a
                href={appStoreLink}
                className="block w-full bg-orange-600 text-white text-center py-3 md:py-4 rounded-xl font-semibold hover:bg-orange-700 transition-colors"
              >
                Get Started
              </a>
            </div>
          </div>

          <p className="text-center text-sm text-gray-500 mt-8">
            All subscriptions are managed through the App Store. Cancel anytime in your device settings.
          </p>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 md:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-10">
          <div className="bg-gray-900 text-white rounded-2xl md:rounded-3xl p-12 md:p-24 text-center relative overflow-hidden">
            <div className="absolute top-[-200px] left-1/2 transform -translate-x-1/2" style={{ 
              width: '600px', 
              height: '600px', 
              background: 'radial-gradient(circle, rgba(255, 255, 255, 0.05) 0%, transparent 70%)' 
            }}></div>
            <div className="relative z-10">
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4 md:mb-6">Start cooking smarter.</h2>
              <p className="text-base md:text-xl text-gray-400 mb-8 md:mb-12 max-w-lg mx-auto">
                Download PocketChef today and turn your ingredients into inspiration.
              </p>
              <div className="flex gap-4 justify-center">
                <a
                  href={appStoreLink}
                  className="bg-white text-gray-900 px-6 md:px-8 rounded-full font-semibold hover:bg-gray-100 transition-colors flex items-center gap-2"
                  style={{ height: '56px' }}
                >
                  <AppleIcon className="w-5 h-5" />
                  App Store
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

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

      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          animation: marquee 20s linear infinite;
          width: max-content;
        }
        @keyframes float-strong {
          0%, 100% { 
            transform: translateY(0) translateX(0) rotate(0deg); 
          }
          25% { 
            transform: translateY(-12px) translateX(2px) rotate(1deg); 
          }
          50% { 
            transform: translateY(-20px) translateX(0) rotate(0deg); 
          }
          75% { 
            transform: translateY(-12px) translateX(-2px) rotate(-1deg); 
          }
        }
        .animate-float-strong {
          animation: float-strong 4s ease-in-out infinite;
        }
        @keyframes waveform {
          0%, 100% { 
            transform: scaleY(1);
            opacity: 0.5;
          }
          50% { 
            transform: scaleY(1.5);
            opacity: 1;
          }
        }
        .animate-waveform {
          animation: waveform 1.2s ease-in-out infinite;
        }
        .border-3 {
          border-width: 3px;
        }
      `}</style>
    </div>
  );
}
