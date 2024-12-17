// src/components/PrivacyPolicy.js
import React from 'react';

const PrivacyPolicy = () => {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Privacy Policy</h1>
      
      <section className="mb-8">
        <p className="mb-4">
          Last updated: December 17, 2024
        </p>
        <p className="mb-4">
          This privacy policy explains how We Know Better ("we", "us", "our") collects, uses, and protects your personal information when you use our website.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Information We Collect</h2>
        <p className="mb-4">
          We collect information that you provide directly to us, including:
        </p>
        <ul className="list-disc pl-5 mb-4">
          <li className="mb-2">Authentication information when you sign up or log in</li>
          <li className="mb-2">Voting history on football predictions</li>
          <li className="mb-2">Communication preferences</li>
          <li className="mb-2">Information you provide through our contact forms</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Cookie Policy</h2>
        <p className="mb-4">
          We use cookies and similar tracking technologies to enhance your experience on our website.
        </p>

        <h3 className="text-lg font-semibold mb-2">Types of Cookies We Use:</h3>
        <ul className="list-disc pl-5 mb-4">
          <li className="mb-2">
            <strong>Essential Cookies:</strong> Required for basic site functionality, such as authentication and remembering your preferences. These cookies are necessary and cannot be disabled.
          </li>
          <li className="mb-2">
            <strong>Analytics Cookies:</strong> Help us understand how visitors interact with our website by collecting and reporting information anonymously. These cookies allow us to improve our service.
          </li>
          <li className="mb-2">
            <strong>Advertising Cookies:</strong> Used to deliver relevant advertisements and track ad campaign performance. We use Google AdSense to show personalized ads based on your interests and browsing behavior.
          </li>
        </ul>

        <h3 className="text-lg font-semibold mb-2">Third-Party Services</h3>
        <p className="mb-4">
          We use Google AdSense to display advertisements on our website. Google AdSense uses cookies to:
        </p>
        <ul className="list-disc pl-5 mb-4">
          <li className="mb-2">Show personalized ads based on your interests</li>
          <li className="mb-2">Limit the number of times you see an ad</li>
          <li className="mb-2">Measure the effectiveness of advertising campaigns</li>
          <li className="mb-2">Understand user behavior and preferences</li>
        </ul>
        <p className="mb-4">
          For more information about how Google uses your data, visit{' '}
          <a href="https://policies.google.com/technologies/ads" className="text-blue-500 hover:text-blue-600" target="_blank" rel="noopener noreferrer">
            Google's Privacy & Terms
          </a>
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Your Privacy Rights</h2>
        <p className="mb-4">You have the right to:</p>
        <ul className="list-disc pl-5 mb-4">
          <li className="mb-2">Access your personal data</li>
          <li className="mb-2">Correct inaccurate personal data</li>
          <li className="mb-2">Request deletion of your personal data</li>
          <li className="mb-2">Object to processing of your personal data</li>
          <li className="mb-2">Control your cookie preferences through our cookie consent manager</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Data Protection</h2>
        <p className="mb-4">
          We implement appropriate technical and organizational measures to protect your personal data against unauthorized or unlawful processing, accidental loss, destruction, or damage.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Changes to This Policy</h2>
        <p className="mb-4">
          We may update this privacy policy from time to time. We will notify you of any changes by posting the new policy on this page and updating the "Last updated" date.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Contact Us</h2>
        <p>
          If you have any questions about this privacy policy or our practices, please contact us at{' '}
          <a href="mailto:f.data.app@gmail.com" className="text-blue-500 hover:text-blue-600">
            f.data.app@gmail.com
          </a>
        </p>
      </section>
    </div>
  );
};

export default PrivacyPolicy;