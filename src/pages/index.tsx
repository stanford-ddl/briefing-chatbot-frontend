import { useState } from 'react';
import { useRouter } from 'next/router';
import Image from 'next/image';
import { Source_Sans_3, Source_Serif_4 } from "next/font/google";
import { validateAccessCode } from '@/lib/access-control';

const sourceSans = Source_Sans_3({
  variable: "--font-source-sans",
  subsets: ["latin"],
});

const sourceSerif = Source_Serif_4({
  variable: "--font-source-serif",
  subsets: ["latin"],
});

export default function Home() {
  const router = useRouter();
  const [accessCode, setAccessCode] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const result = await validateAccessCode(accessCode.trim().toUpperCase());
      
      if (!result.valid) {
        setError(result.error || 'Invalid access code');
        setIsLoading(false);
        return;
      }

      // Redirect to the session page with access code
      router.push(`/session/${accessCode.trim().toUpperCase()}`);
    } catch {
      setError('Something went wrong. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div
      className={`${sourceSans.variable} ${sourceSerif.variable} font-sans min-h-screen bg-gray-50 flex items-center justify-center`}
    >
      <div className="max-w-md w-full mx-auto p-4 md:p-6">
        {/* Header */}
        <div className="text-center mb-8">
          {/* Lab Logo */}
          <div className="flex justify-center mb-4">
            <Image
              src="/lab-logo.png" // DDL logo (replace later with higher quality logo)
              alt="Lab Logo"
              width={220}
              height={120}
              className="object-contain"
              onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                e.currentTarget.style.display = 'none';
                e.currentTarget.nextElementSibling?.classList.remove('hidden');
              }}
            />
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center hidden">
              <span className="text-3xl">📄</span>
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-3">
            Your Deliberation Guide
          </h1>
          <p className="text-gray-600">
            Ask questions, explore key ideas, and prepare for your deliberation by chatting with your briefing material.
          </p>
        </div>

        {/* Access Code Form */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 md:p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <input
                type="text"
                id="accessCode"
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value)}
                placeholder="Enter your access code"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:border-[#a70532] focus:shadow-[0_0_0_2px_rgba(167,5,50,0.1)] text-center font-sans text-lg tracking-wider transition-all duration-200"
                disabled={isLoading}
                autoFocus
                required
              />
              {error && (
                <p className="mt-2 text-sm text-red-600 text-center">{error}</p>
              )}
            </div>
            
            <button
              type="submit"
              disabled={isLoading || !accessCode.trim()}
              className="w-full bg-[#a70532] text-white py-2 px-4 rounded-md hover:bg-[#8b0429] focus:outline-none focus:ring-2 focus:ring-[#a70532] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Validating...' : 'Start Chat'}
            </button>
          </form>
        </div>

        {/* Help Section - Only show when there's an error */}
        {error && (
          <div className="mt-8 text-center">
            <div className="bg-red-50 rounded-lg p-4">
              <p className="text-sm text-red-700">
                Didn&apos;t get a code? Reach out to us at xyz@stanford.edu.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}