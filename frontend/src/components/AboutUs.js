import React from 'react';

const AboutUs = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-center mb-8">About We Know Better</h1>
      
      <div className="space-y-6 text-gray-700">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-semibold mb-4">Our Mission</h2>
          <p className="leading-relaxed">
            "We Know Better" is a cutting-edge web application revolutionizing football match predictions. 
            We combine the passion of football fans with advanced artificial intelligence to create a unique 
            prediction platform that's accessible to everyone, whether you're a registered user or just 
            browsing.
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-semibold mb-4">What Sets Us Apart</h2>
          <p className="leading-relaxed">
            Our platform stands out through its innovative combination of human insight and artificial 
            intelligence. Our expert system utilizes sophisticated algorithms, machine learning models, 
            and AI tools to analyze matches and generate predictions with remarkable accuracy. We're 
            confident in our ability to outperform traditional prediction methods, and we have the 
            track record to prove it.
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-semibold mb-4">How It Works</h2>
          <div className="space-y-4">
            <div className="flex items-start space-x-4">
              <div className="flex-1">
                <h3 className="font-semibold">For Fans</h3>
                <p>Make predictions on upcoming matches, track your accuracy, and compete with others globally.</p>
              </div>
            </div>
            <div className="flex items-start space-x-4">
              <div className="flex-1">
                <h3 className="font-semibold">AI Predictions</h3>
                <p>Our AI system analyzes vast amounts of data to generate highly accurate predictions.</p>
              </div>
            </div>
            <div className="flex items-start space-x-4">
              <div className="flex-1">
                <h3 className="font-semibold">Performance Tracking</h3>
                <p>Compare your prediction accuracy with both other users and our AI system.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AboutUs;