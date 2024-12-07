// src/components/PrivacyPolicy.js
import React from 'react';

const PrivacyPolicy = () => {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Privacy Policy</h1>
      
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Cookie Policy</h2>
        <p className="mb-4">
          We use cookies to improve your experience on our website. By using We Know Better, 
          you consent to the use of cookies.
        </p>

        <h3 className="text-lg font-semibold mb-2">What are cookies?</h3>
        <p className="mb-4">
          Cookies are small text files that are stored on your device when you visit our website. 
          They help us provide essential features and analyze how you use our site.
        </p>

        <h3 className="text-lg font-semibold mb-2">What cookies do we use?</h3>
        <ul className="list-disc pl-5 mb-4">
          <li className="mb-2">
            <strong>Essential Cookies:</strong> Required for basic site functionality 
            (authentication, remembering your preferences)
          </li>
          <li className="mb-2">
            <strong>Vote History:</strong> To track which matches you've voted on
          </li>
        </ul>

        <h3 className="text-lg font-semibold mb-2">Your Cookie Choices</h3>
        <p className="mb-4">
          Most web browsers allow you to control cookies through their settings. However, 
          if you limit the ability of websites to set cookies, you may worsen your overall 
          user experience.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Contact Us</h2>
        <p>
          If you have any questions about our cookie policy, please contact us at{' '}
          <a href="mailto:contact@weknowbetter.com" className="text-blue-500 hover:text-blue-600">
            f.data.app@gmail.com
          </a>
        </p>
      </section>
    </div>
  );
};

export default PrivacyPolicy;