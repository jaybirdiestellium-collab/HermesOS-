import React, { useState, useCallback } from 'react';
import { ImageGenerationOptions, GeneratedImage } from '../types';
import { generateImage } from '../services/geminiService';
import { Button } from './common/Button';
import { Loader } from './common/Loader';
import { SUPPORTED_IMAGE_SIZES, ImageSize } from '../constants';

export const ImageForge: React.FC = () => {
  const [prompt, setPrompt] = useState<string>('');
  const [imageSize, setImageSize] = useState<ImageSize>(ImageSize.K1);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerateImage = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || loading) return;

    setError(null);
    setLoading(true);

    try {
      const options: ImageGenerationOptions = { prompt, imageSize };
      const imageUrl = await generateImage(options);
      setGeneratedImages(prev => [{ imageUrl, altText: prompt }, ...prev]);
      setPrompt(''); // Clear prompt after successful generation
    } catch (err: any) {
      console.error("Image generation error:", err);
      setError(err.message || "Failed to forge image. Signal anomaly detected.");
    } finally {
      setLoading(false);
    }
  }, [prompt, imageSize, loading]);

  return (
    <div className="flex flex-col h-[calc(100vh-250px)] md:h-[calc(100vh-200px)]">
      <h3 className="text-xl font-bold mb-4 text-purple-300">Image Forge - Uranus Anomaly</h3>
      <form onSubmit={handleGenerateImage} className="mb-6 sticky top-0 bg-purple-900 bg-opacity-30 p-4 -mx-4 -my-4 rounded-t-lg">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe the image to manifest in the forge..."
          rows={3}
          className="w-full p-3 rounded-lg bg-purple-800 bg-opacity-60 text-white placeholder-purple-300 border border-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 mb-4"
          disabled={loading}
        ></textarea>
        <div className="flex flex-col sm:flex-row items-center justify-between space-y-4 sm:space-y-0 sm:space-x-4">
          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <label htmlFor="imageSize" className="text-purple-200 font-medium whitespace-nowrap">Image Size:</label>
            <select
              id="imageSize"
              value={imageSize}
              onChange={(e) => setImageSize(e.target.value as ImageSize)}
              className="p-2 rounded-lg bg-purple-800 bg-opacity-60 text-white border border-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 w-full sm:w-auto"
              disabled={loading}
            >
              {SUPPORTED_IMAGE_SIZES.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>
          <Button type="submit" loading={loading} disabled={loading} className="w-full sm:w-auto">
            {loading ? 'Forging Image...' : 'Forge Image'}
          </Button>
        </div>
      </form>

      {error && (
        <div className="bg-red-800 bg-opacity-50 text-red-200 p-3 rounded-md mb-4 text-sm" role="alert">
          Error: {error}
        </div>
      )}

      <div className="flex-grow overflow-y-auto pr-2 custom-scrollbar grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {generatedImages.length === 0 && !loading && (
          <p className="text-center text-gray-400 col-span-full">No images forged yet. Describe a vision!</p>
        )}
        {loading && (
          <div className="col-span-full flex flex-col items-center justify-center p-8 bg-purple-800 bg-opacity-40 rounded-lg">
            <Loader size="lg" />
            <p className="mt-4 text-lg text-purple-200">Processing the anomaly... This may take a moment.</p>
          </div>
        )}
        {generatedImages.map((image, index) => (
          <div key={index} className="bg-purple-800 bg-opacity-40 p-4 rounded-lg shadow-md border border-purple-700">
            <img src={image.imageUrl} alt={image.altText} className="w-full h-auto rounded-lg mb-2 object-cover" />
            <p className="text-sm text-gray-300 italic">{image.altText}</p>
          </div>
        ))}
      </div>
    </div>
  );
};