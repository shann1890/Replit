import { Cloud, Network, Shield, Settings, Headphones, BarChart } from "lucide-react";

export default function ServicesSection() {
  const services = [
    {
      icon: <Cloud className="h-6 w-6" />,
      title: "Cloud Computing",
      description: "Migration, deployment, and optimization on AWS, Azure, and Google Cloud platforms with enterprise-grade security.",
      features: ["Cloud Migration", "Infrastructure Management", "Cost Optimization"]
    },
    {
      icon: <Network className="h-6 w-6" />,
      title: "Network & Server Setup", 
      description: "Professional network architecture and server deployment using Cisco, Microsoft, and enterprise solutions.",
      features: ["Network Design", "Server Configuration", "Performance Optimization"]
    },
    {
      icon: <Shield className="h-6 w-6" />,
      title: "Cybersecurity",
      description: "Advanced security implementations with Fortinet, SentinelOne, TrendMicro, and enterprise security frameworks.",
      features: ["Threat Protection", "Security Audits", "Compliance Management"]
    },
    {
      icon: <Settings className="h-6 w-6" />,
      title: "DevOps & Automation",
      description: "Streamline operations with modern DevOps practices, CI/CD pipelines, and infrastructure automation.",
      features: ["CI/CD Implementation", "Infrastructure as Code", "Monitoring & Analytics"]
    },
    {
      icon: <Headphones className="h-6 w-6" />,
      title: "IT Support & Maintenance",
      description: "Comprehensive support services with proactive monitoring and rapid response capabilities.",
      features: ["24/7 Monitoring", "Remote Support", "Preventive Maintenance"]
    },
    {
      icon: <BarChart className="h-6 w-6" />,
      title: "Data Analytics",
      description: "Business intelligence solutions using Elastic Stack and modern analytics platforms for data-driven decisions.",
      features: ["Data Visualization", "Business Intelligence", "Custom Dashboards"]
    }
  ];

  const partners = [
    "Microsoft", "Amazon", "Cisco", "Fortinet", "SentinelOne", "TrendMicro", "Elastic", "BIG-IP"
  ];

  return (
    <section id="services" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Our IT Services</h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Comprehensive technology solutions backed by expertise in leading platforms
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          {services.map((service, index) => (
            <div key={index} className="bg-gray-50 p-8 rounded-xl hover:shadow-lg transition-shadow">
              <div className="bg-purple-100 w-12 h-12 rounded-lg flex items-center justify-center mb-6 text-purple-600">
                {service.icon}
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">{service.title}</h3>
              <p className="text-gray-600 mb-6">{service.description}</p>
              <ul className="text-sm text-gray-600 space-y-2">
                {service.features.map((feature, featureIndex) => (
                  <li key={featureIndex} className="flex items-center">
                    <svg className="w-4 h-4 text-purple-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Technology Partners */}
        <div className="bg-gray-50 p-8 rounded-xl">
          <h3 className="text-xl font-bold text-gray-900 mb-6 text-center">Trusted Technology Partners</h3>
          <div className="flex flex-wrap justify-center items-center gap-8 opacity-60">
            {partners.map((partner, index) => (
              <span key={index} className="text-lg font-semibold text-gray-600">{partner}</span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
