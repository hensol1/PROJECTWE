import React, { useState } from 'react';
import { Dialog } from '@headlessui/react';
import { CheckCircleIcon } from 'lucide-react';
import api from '../api';

const ContactUs = () => {
    const [formData, setFormData] = useState({
      name: '',
      email: '',
      subject: 'feedback',
      message: ''
    });
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
  
    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
      
        try {
          const response = await api.submitContactForm(formData);
          console.log('Contact form response:', response);
          setShowSuccessModal(true);
          setFormData({ name: '', email: '', subject: 'feedback', message: '' });
        } catch (err) {
          console.error('Contact form error:', err);
          const errorMessage = err.response?.data?.message || 
                              err.response?.data?.error || 
                              'Failed to send message. Please try again later.';
          setError(errorMessage);
        } finally {
          setLoading(false);
        }
      };
      
            
  return (
    <>
      <div className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-center mb-8">Contact Us</h1>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <p className="text-gray-700 mb-6">
            We value your feedback and are constantly working to improve our platform. 
            Whether you have suggestions, found an issue, or just want to share your thoughts, 
            we'd love to hear from you.
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">Name</label>
              <input
                type="text"
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
              <input
                type="email"
                id="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label htmlFor="subject" className="block text-sm font-medium text-gray-700">Subject</label>
              <select
                id="subject"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="feedback">General Feedback</option>
                <option value="suggestion">Suggestion</option>
                <option value="issue">Report an Issue</option>
              </select>
            </div>

            <div>
              <label htmlFor="message" className="block text-sm font-medium text-gray-700">Message</label>
              <textarea
                id="message"
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                rows={5}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
              />
            </div>

            {error && (
              <div className="p-4 rounded bg-red-100 text-red-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Sending...' : 'Send Message'}
            </button>
          </form>
        </div>
      </div>

      {/* Success Modal */}
      <Dialog 
        open={showSuccessModal} 
        onClose={() => setShowSuccessModal(false)}
        className="relative z-50"
      >
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="mx-auto max-w-sm rounded-lg bg-white p-6 shadow-xl">
            <div className="flex flex-col items-center">
              <CheckCircleIcon className="h-12 w-12 text-green-500 mb-4" />
              
              <Dialog.Title className="text-lg font-medium text-center mb-2">
                Message Sent Successfully!
              </Dialog.Title>
              
              <Dialog.Description className="text-sm text-gray-500 text-center mb-4">
                Thank you for reaching out to us. We've received your message and will get back to you as soon as possible.
              </Dialog.Description>

              <button
                onClick={() => setShowSuccessModal(false)}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Close
              </button>
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>
    </>
  );
};

export default ContactUs;