import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import HeroSection from '../components/HeroSection';
import Philosophy from '../components/Philosophy';
import ProductExperience from '../components/ProductExperience';
import TrustArchitecture from '../components/TrustArchitecture';
import PricingComparison from '../components/PricingComparison';
import ConversionFooter from '../components/ConversionFooter';
import LandingNav from '../components/LandingNav';

/**
 * Landing Page
 * 
 * The public-facing homepage that showcases AetherTrack's value proposition.
 * - HeroSection: First 5 seconds impact
 * - Philosophy: Why AetherTrack exists
 * - ProductExperience: Visual product tour
 * - TrustArchitecture: Security and reliability
 * - PricingComparison: Pricing and value
 * - ConversionFooter: CTAs and footer
 */
const Landing = () => {
  const navigate = useNavigate();
  const [scrollY, setScrollY] = useState(0);

  React.useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="landing-page" style={{ background: 'var(--bg-canvas)' }}>
      {/* Navigation */}
      <LandingNav scrollY={scrollY} />

      {/* Hero Section */}
      <HeroSection />

      {/* Philosophy */}
      <Philosophy />

      {/* Product Experience */}
      <ProductExperience />

      {/* Trust Architecture */}
      <TrustArchitecture />

      {/* Pricing */}
      <PricingComparison />

      {/* Conversion Footer */}
      <ConversionFooter />
    </div>
  );
};

export default Landing;
