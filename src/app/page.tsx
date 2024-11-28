'use client';

import { useState } from 'react';
import { getAllBuyerAddresses } from '../utils/contractInteractions';

export default function Home() {
  const [contractAddress, setContractAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [buyerAddresses, setBuyerAddresses] = useState<string[]>([]);
  const [lastPage, setLastPage] = useState<number | undefined>();
  const [isComplete, setIsComplete] = useState(false);
  const [resumeInfo, setResumeInfo] = useState<string>('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResumeInfo('');
    setBuyerAddresses([]);
    setLastPage(undefined);
    setIsComplete(false);

    try {
      const result = await getAllBuyerAddresses(contractAddress);
      setBuyerAddresses(result.buyerAddresses);
      setLastPage(result.lastProcessedPage);
      setIsComplete(result.isComplete);
    } catch (error) {
      console.error('Error:', error);
      setError(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const copyAddresses = () => {
    navigator.clipboard.writeText(buyerAddresses.join('\n'))
      .then(() => alert('Addresses copied to clipboard!'))
      .catch(() => alert('Failed to copy addresses'));
  };

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Contract Buyer Address Scanner</h1>
        
        <form onSubmit={handleSubmit} className="mb-8">
          <div className="flex gap-4">
            <input
              type="text"
              value={contractAddress}
              onChange={(e) => setContractAddress(e.target.value)}
              placeholder="Enter contract address"
              className="flex-1 p-2 border rounded"
            />
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
            >
              {loading ? 'Scanning...' : 'Scan'}
            </button>
          </div>
        </form>

        {error && (
          <div className="p-4 mb-4 text-red-700 bg-red-100 rounded">
            {error}
          </div>
        )}

        {resumeInfo && (
          <div className="p-4 mb-4 text-blue-700 bg-blue-50 rounded">
            {resumeInfo}
          </div>
        )}

        {buyerAddresses.length > 0 && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-xl font-semibold">Unique Buyers Found: {buyerAddresses.length}</h2>
                {!isComplete && lastPage && (
                  <p className="text-amber-600 mt-2">
                    ⚠️ Daily API limit reached at page {lastPage}. Try again tomorrow to continue from page {lastPage + 1}.
                  </p>
                )}
                {isComplete && (
                  <p className="text-green-600 mt-2">
                    ✓ Collection complete! All available buyer addresses have been retrieved.
                  </p>
                )}
              </div>
              <button
                onClick={copyAddresses}
                className="px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
              >
                Copy All
              </button>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg border">
              <div className="max-h-96 overflow-y-auto font-mono text-sm">
                {buyerAddresses.map((address, index) => (
                  <div key={index} className="py-1 hover:bg-gray-100">
                    {address}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
