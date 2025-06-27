import { Button } from "@/components/ui/button";
import { Star } from "lucide-react";

export default function AboutSection() {
  const highlights = [
    "Certified expertise across major platforms",
    "Nationwide service coverage across Malaysia", 
    "Tailored solutions for individuals and SMEs",
    "24/7 support and proactive monitoring"
  ];

  return (
    <section id="about" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <img 
              src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1974&q=80" 
              alt="Professional IT consultant reviewing technical documentation" 
              className="rounded-xl shadow-lg w-full"
            />
          </div>
          <div>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
              Expert IT Solutions for Malaysian Businesses
            </h2>
            <p className="text-lg text-gray-600 mb-6">
              With extensive hands-on experience across the full spectrum of IT disciplines, I deliver 
              enterprise-grade solutions that scale with your business needs.
            </p>
            <div className="space-y-4 mb-8">
              {highlights.map((highlight, index) => (
                <div key={index} className="flex items-center space-x-3">
                  <Star className="h-5 w-5 text-purple-600" />
                  <span className="text-gray-700">{highlight}</span>
                </div>
              ))}
            </div>
            <Button 
              onClick={() => {
                const element = document.getElementById('contact');
                if (element) {
                  element.scrollIntoView({ behavior: 'smooth' });
                }
              }}
              className="bg-purple-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-purple-700 transition-colors"
            >
              Learn More About Our Approach
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
