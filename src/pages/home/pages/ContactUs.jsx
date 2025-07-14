import React, { useState } from "react";
import {
  MapPin,
  Phone,
  Mail,
  Clock,
  Send,
  CheckCircle,
  PhoneCall,
  Globe,
  Facebook,
  Linkedin,
  ExternalLink,
} from "lucide-react";

const ContactUs = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleContactClick = (action, detail) => {
    if (action === "call") {
      window.location.href = `tel:${detail
        .replace(/\s+/g, "")
        .replace(/[^\d+]/g, "")}`;
    } else if (action === "email") {
      window.location.href = `mailto:${detail}`;
    } else if (action === "website") {
      window.open(detail, "_blank", "noopener,noreferrer");
    }
  };

  const handleSocialClick = (url) => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Create email body
      const emailBody = `
Name: ${formData.name}
Email: ${formData.email}
Phone: ${formData.phone}
Subject: ${formData.subject}

Message:
${formData.message}

---
Sent from Rice Mill Management System - Technical Support Form
      `;

      // Create mailto link
      const mailtoLink = `mailto:lumoraventures@gmail.com?subject=Technical Support Request - ${
        formData.subject
      }&body=${encodeURIComponent(emailBody)}`;

      // Open email client
      window.location.href = mailtoLink;

      // Simulate processing time
      await new Promise((resolve) => setTimeout(resolve, 1500));

      setIsSubmitting(false);
      setIsSubmitted(true);

      // Reset form after showing success
      setTimeout(() => {
        setFormData({
          name: "",
          email: "",
          phone: "",
          subject: "",
          message: "",
        });
        setIsSubmitted(false);
      }, 3000);
    } catch (error) {
      console.error("Error sending message:", error);
      setIsSubmitting(false);
    }
  };

  const contactInfo = [
    {
      icon: <MapPin className="w-6 h-6" />,
      title: "Head Office",
      details: [
        "UK Office",
        "Office 4157, 58 Peregrine Road Hainault,",
        "Ilford, Essex United Kingdom, IG6 3SZ",
        "",
        "Sri Lanka Office",
        "Ihala Muruthenge, Nakkawaththa, 24/2403",
      ],
    },
    {
      icon: <Phone className="w-6 h-6" />,
      title: "Technical Support",
      details: ["+94 71 9999 8500", "+94 76 620 6555 (24/7 Hotline)"],
      clickable: true,
      action: "call",
    },
    {
      icon: <Mail className="w-6 h-6" />,
      title: "Technical Team",
      details: ["lumoraventures@gmail.com", "info@lumoraventures.com"],
      clickable: true,
      action: "email",
    },
    {
      icon: <Clock className="w-6 h-6" />,
      title: "Support Hours",
      details: [
        "Mon - Fri: 8:00 AM - 8:00 PM",
        "Sat: 9:00 AM - 5:00 PM",
        "Emergency: 24/7",
      ],
    },
  ];

  const socialLinks = [
    {
      name: "Website",
      icon: <Globe className="w-5 h-5" />,
      url: "https://www.lumoraventures.com",
      color: "bg-blue-600 hover:bg-blue-700",
      description: "Visit our official website",
    },
    {
      name: "LinkedIn",
      icon: <Linkedin className="w-5 h-5" />,
      url: "https://www.linkedin.com/company/lumora-ventures-pvt-ltd/",
      color: "bg-blue-700 hover:bg-blue-800",
      description: "Follow us on LinkedIn",
    },
    {
      name: "Facebook",
      icon: <Facebook className="w-5 h-5" />,
      url: "https://web.facebook.com/people/Lumora-Ventures/61575034203203/?sk=about",
      color: "bg-blue-800 hover:bg-blue-900",
      description: "Follow us on Facebook",
    },
  ];

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">
            Message Sent Successfully!
          </h2>
          <p className="text-gray-600 mb-8 leading-relaxed">
            Thank you for contacting our technical support team. We'll get back
            to you within 24 hours.
          </p>
          <button
            onClick={() => setIsSubmitted(false)}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-3 rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 font-medium shadow-lg"
          >
            Send Another Message
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Technical Support
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Get expert technical assistance for your Rice Mill Management
              System
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Contact Information */}
          <div className="space-y-8">
            <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                Technical Support Team
              </h2>
              <p className="text-gray-600 mb-8 leading-relaxed">
                Our dedicated technical team is available to assist with system
                setup, troubleshooting, and optimization of your Rice Mill
                Management System. Get expert support when you need it most.
              </p>

              {/* Contact Information Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
                {contactInfo.map((item, index) => (
                  <div
                    key={index}
                    className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100 hover:shadow-md transition-shadow duration-200"
                  >
                    <div className="flex items-center mb-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center text-white mr-4 shadow-md">
                        {item.icon}
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {item.title}
                      </h3>
                    </div>
                    <div className="space-y-2">
                      {item.details.map((detail, detailIndex) => (
                        <div key={detailIndex}>
                          {detail === "" ? (
                            <div className="h-2" />
                          ) : item.clickable &&
                            (item.action === "call" ||
                              item.action === "email") ? (
                            <button
                              onClick={() =>
                                handleContactClick(item.action, detail)
                              }
                              className="text-gray-700 text-sm hover:text-blue-600 transition-colors text-left flex items-center group font-medium"
                            >
                              {item.action === "call" && (
                                <PhoneCall className="w-3 h-3 mr-2 opacity-0 group-hover:opacity-100 transition-opacity" />
                              )}
                              {detail}
                            </button>
                          ) : (
                            <p className="text-gray-700 text-sm leading-relaxed">
                              {detail}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Social Links Section */}
              <div className="border-t border-gray-200 pt-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">
                  Connect With Us
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {socialLinks.map((social, index) => (
                    <button
                      key={index}
                      onClick={() => handleSocialClick(social.url)}
                      className={`${social.color} text-white p-4 rounded-xl transition-all duration-200 hover:scale-105 hover:shadow-lg group`}
                    >
                      <div className="flex items-center justify-center mb-2">
                        {social.icon}
                        <ExternalLink className="w-3 h-3 ml-2 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <div className="text-sm font-medium">{social.name}</div>
                      <div className="text-xs opacity-90 mt-1">
                        {social.description}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Technical Support Request
            </h2>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label
                    htmlFor="name"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Full Name *
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 hover:border-gray-400"
                    placeholder="Your full name"
                  />
                </div>

                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Email Address *
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 hover:border-gray-400"
                    placeholder="your.email@example.com"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label
                    htmlFor="phone"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 hover:border-gray-400"
                    placeholder="+94 77 123 4567"
                  />
                </div>

                <div>
                  <label
                    htmlFor="subject"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Subject *
                  </label>
                  <select
                    id="subject"
                    name="subject"
                    value={formData.subject}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 hover:border-gray-400"
                  >
                    <option value="">Select a subject</option>
                    <option value="technical_issue">Technical Issue</option>
                    <option value="system_setup">System Setup</option>
                    <option value="data_migration">Data Migration</option>
                    <option value="feature_request">Feature Request</option>
                    <option value="training">Training & Documentation</option>
                    <option value="urgent_support">Urgent Support</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label
                  htmlFor="message"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Message *
                </label>
                <textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleInputChange}
                  required
                  rows={6}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 resize-none hover:border-gray-400"
                  placeholder="Describe your technical issue, system requirement, or question in detail..."
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 px-6 rounded-lg hover:from-blue-700 hover:to-indigo-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center font-medium shadow-lg hover:shadow-xl"
              >
                {isSubmitting ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Sending Message...
                  </div>
                ) : (
                  <div className="flex items-center">
                    <Send className="w-5 h-5 mr-2" />
                    Send Support Request
                  </div>
                )}
              </button>
            </form>

            {/* Additional Help Text */}
            <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-800">
                <strong>Need immediate assistance?</strong> Call our 24/7
                hotline at{" "}
                <button
                  onClick={() => handleContactClick("call", "+94 76 620 6555")}
                  className="font-semibold hover:underline"
                >
                  +94 76 620 6555
                </button>{" "}
                for urgent technical support.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export { ContactUs };
export default ContactUs;
