import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Mail, Phone, MapPin, Send, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import SEO from "@/components/SEO";
import siteLogo from "../../assets/site_logo.png";

export default function Contact() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    // Simulate API call
    setTimeout(() => {
      setIsSubmitting(false);
      setSubmitted(true);
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0B0F19] text-slate-900 dark:text-slate-100 flex flex-col font-sans selection:bg-primary/30">
      <SEO 
        title="Contact Us - EasyBMT" 
        description="Get in touch with the EasyBMT team for sales, support, or partnership inquiries." 
      />

      {/* Modern Header */}
      <header className="w-full py-4 px-6 md:px-12 flex items-center justify-between sticky top-0 z-50 bg-white/70 dark:bg-[#0B0F19]/70 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
        <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <img src={siteLogo} alt="EasyBMT" className="h-8 w-auto object-contain" />
        </Link>
        <Link to="/" className="text-sm font-semibold flex items-center gap-1 text-slate-600 dark:text-slate-400 hover:text-primary transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </Link>
      </header>

      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-background to-success/5 pt-16 pb-20 px-6">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/20 rounded-full blur-[100px] -z-10"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-500/10 rounded-full blur-[100px] -z-10"></div>
        
        <div className="max-w-4xl mx-auto text-center z-10 relative">
          <h1 className="text-4xl md:text-6xl font-black mb-6 tracking-tight">
            We'd love to <span className="text-primary drop-shadow-sm">hear from you</span>
          </h1>
          <p className="text-lg md:text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto font-medium">
            Whether you have a question about features, pricing, or need technical support, our team is ready to answer all your questions.
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 py-16 w-full grid grid-cols-1 md:grid-cols-5 gap-12 relative z-10 -mt-10">
        
        {/* Contact Info Cards */}
        <div className="md:col-span-2 flex flex-col gap-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xl shadow-slate-200/20 dark:shadow-none hover:shadow-primary/10 hover:-translate-y-1 transition-all duration-300">
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
              <Mail className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-xl font-bold mb-2">Email Us</h3>
            <p className="text-slate-600 dark:text-slate-400 text-sm mb-4">Our friendly team is here to help.</p>
            <a href="mailto:support@easybmt.com" className="font-bold text-primary hover:underline">support@easybmt.com</a>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xl shadow-slate-200/20 dark:shadow-none hover:shadow-primary/10 hover:-translate-y-1 transition-all duration-300">
            <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center mb-4">
              <MapPin className="w-6 h-6 text-blue-500" />
            </div>
            <h3 className="text-xl font-bold mb-2">Visit Us</h3>
            <p className="text-slate-600 dark:text-slate-400 text-sm mb-4">Come say hello at our office HQ.</p>
            <span className="font-bold text-sm leading-relaxed">Ward No. 14, Karpurichowk, Shivnagar, Shivajinagar, Samastipur Bihar-848117, India.</span>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xl shadow-slate-200/20 dark:shadow-none hover:shadow-primary/10 hover:-translate-y-1 transition-all duration-300">
            <div className="w-12 h-12 bg-success/10 rounded-xl flex items-center justify-center mb-4">
              <Phone className="w-6 h-6 text-success" />
            </div>
            <h3 className="text-xl font-bold mb-2">Call Us</h3>
            <p className="text-slate-600 dark:text-slate-400 text-sm mb-4">Mon-Fri from 9am to 6pm.</p>
            <a href="tel:+919801200459" className="font-bold text-success hover:underline">+91 9801200459</a>
          </div>
        </div>

        {/* Contact Form */}
        <div className="md:col-span-3">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 md:p-10 shadow-2xl shadow-slate-200/40 dark:shadow-none">
            <h2 className="text-2xl font-black mb-6">Send us a message</h2>
            
            {submitted ? (
              <div className="bg-success/10 border border-success/30 rounded-2xl p-8 text-center animate-in fade-in zoom-in duration-500">
                <div className="w-16 h-16 bg-success/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Send className="w-8 h-8 text-success" />
                </div>
                <h3 className="text-2xl font-bold mb-2">Message Sent!</h3>
                <p className="text-slate-600 dark:text-slate-400 mb-6">We've received your message and will get back to you within 24 hours.</p>
                <Button onClick={() => setSubmitted(false)} variant="outline" className="font-bold border-slate-300 dark:border-slate-700">Send Another Message</Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700 dark:text-slate-300">First Name</label>
                    <input required type="text" className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-[#0B0F19] border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow" placeholder="John" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Last Name</label>
                    <input required type="text" className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-[#0B0F19] border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow" placeholder="Doe" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Email Address</label>
                  <input required type="email" className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-[#0B0F19] border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow" placeholder="you@company.com" />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Subject</label>
                  <input required type="text" className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-[#0B0F19] border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow" placeholder="How can we help?" />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Message</label>
                  <textarea required rows={5} className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-[#0B0F19] border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow resize-none" placeholder="Leave us a message..."></textarea>
                </div>

                <Button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="w-full py-6 text-lg font-black bg-primary text-black hover:opacity-90 shadow-lg shadow-primary/20 transition-all hover:scale-[1.01]"
                >
                  {isSubmitting ? "Sending..." : "Send Message"}
                </Button>
              </form>
            )}
          </div>
        </div>
      </div>
      
    </div>
  );
}
