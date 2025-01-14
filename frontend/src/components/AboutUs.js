import React from 'react';

const AboutUs = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-center mb-8">About We Know Better</h1>
      
      <div className="space-y-6 text-gray-700">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-semibold mb-4">Our Mission</h2>
          <p className="leading-relaxed">
            "We Know Better" is a state-of-the-art football prediction platform that showcases expert 
            predictions powered by advanced artificial intelligence. Our mission is to provide accurate, 
            data-driven match predictions while maintaining complete transparency about our performance 
            and accuracy.
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-semibold mb-4">Our Technology</h2>
          <p className="leading-relaxed">
            Our platform stands out through its innovative combination of human insight and artificial 
            intelligence. Our expert system utilizes sophisticated algorithms, machine learning models, 
            and AI tools to analyze matches and generate predictions with remarkable accuracy. We're 
            confident in our ability to outperform traditional prediction methods, and we have the 
            track record to prove it.
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-semibold mb-4">What We Offer</h2>
          <div className="space-y-4">
            <div className="flex items-start space-x-4">
              <div className="flex-1">
                <h3 className="font-semibold">Expert Predictions</h3>
                <p>Advanced AI-powered predictions for football matches across major leagues worldwide.</p>
              </div>
            </div>
            <div className="flex items-start space-x-4">
              <div className="flex-1">
                <h3 className="font-semibold">Real-Time Updates</h3>
                <p>Live scores, match events, and instant updates for all covered matches.</p>
              </div>
            </div>
            <div className="flex items-start space-x-4">
              <div className="flex-1">
                <h3 className="font-semibold">Performance Tracking</h3>
                <p>Transparent accuracy tracking and detailed statistics of our prediction performance.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-semibold mb-4">Our Commitment</h2>
          <p className="leading-relaxed">
            We are committed to providing the most accurate football predictions possible, backed by 
            continuous monitoring and improvement of our AI system. Our platform offers complete 
            transparency in our prediction accuracy, allowing users to track our performance over time 
            and make informed decisions based on our proven track record.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AboutUs;