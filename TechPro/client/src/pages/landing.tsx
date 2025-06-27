import Navigation from "@/components/navigation";
import Hero from "@/components/hero";
import ServicesSection from "@/components/services-section";
import ClientPortalDemo from "@/components/client-portal-demo";
import AboutSection from "@/components/about-section";
import ContactSection from "@/components/contact-section";
import Footer from "@/components/footer";

export default function Landing() {
  return (
    <div className="min-h-screen bg-white">
      <Navigation />
      <Hero />
      <ServicesSection />
      <ClientPortalDemo />
      <AboutSection />
      <ContactSection />
      <Footer />
    </div>
  );
}
