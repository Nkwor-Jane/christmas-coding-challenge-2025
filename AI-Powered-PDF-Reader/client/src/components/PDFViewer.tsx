import React, { useState, useRef, useEffect } from 'react';
import { FileText, X, AlertCircle } from 'lucide-react';

// Define types for the PDF data
interface PDFData {
  file: File;
  name: string;
  size: number;
  url: string;
}

// Define props interface
interface PDFViewerProps {
  pdfData: PDFData | null;
  onClose: () => void;
  onTextExtracted?: (text: string) => void;
}

const PDFViewer: React.FC<PDFViewerProps> = ({ pdfData, onClose, onTextExtracted }) => {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [extractedText, setExtractedText] = useState<string>('');
  const [pdfObjectUrl, setPdfObjectUrl] = useState<string>('');
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (pdfData?.file) {
      // Create object URL for the PDF file
      const objectUrl = URL.createObjectURL(pdfData.file);
      setPdfObjectUrl(objectUrl);

      // Simulate text extraction (in real app, use PDF.js)
      setTimeout(() => {
        const mockText = `Sample extracted text from ${pdfData.name}.\n\nThis is a demonstration of the PDF viewer component. In a production environment, you would use PDF.js library to:\n\n1. Parse the PDF file\n2. Extract text content from each page\n3. Render the PDF for viewing\n4. Enable text-to-speech functionality\n\nThe extracted text would then be passed to the AI chatbot for context-aware question answering.`;
        
        setExtractedText(mockText);
        onTextExtracted?.(mockText);
        setIsLoading(false);
      }, 1500);

      // Cleanup function to revoke object URL
      return () => {
        URL.revokeObjectURL(objectUrl);
      };
    }
  }, [pdfData, onTextExtracted]);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  if (!pdfData) return null;

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gray-800 text-white p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileText className="w-6 h-6" />
          <div>
            <h3 className="font-semibold truncate max-w-md">{pdfData.name}</h3>
            <p className="text-sm text-gray-300">{formatFileSize(pdfData.size)}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
          title="Close PDF"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* PDF Content Area */}
      <div className="relative">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50 z-10">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
              <p className="text-gray-600">Loading PDF...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="p-8 bg-red-50 flex items-center justify-center gap-3">
            <AlertCircle className="w-6 h-6 text-red-600" />
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {/* PDF Display */}
        <div className="bg-gray-100 p-4" style={{ height: '600px' }}>
          <div className="bg-white rounded shadow-md h-full overflow-hidden">
            {pdfObjectUrl && (
              <iframe
                ref={iframeRef}
                src={pdfObjectUrl}
                className="w-full h-full border-0"
                title="PDF Viewer"
                onLoad={() => {
                  setIsLoading(false);
                  setError(null);
                }}
                onError={() => {
                  setIsLoading(false);
                  setError('Failed to load PDF. Your browser may not support PDF viewing.');
                }}
              />
            )}
          </div>
        </div>

        {/* Extracted Text Preview (for development) */}
        {extractedText && (
          <div className="p-4 bg-gray-50 border-t">
            <details className="cursor-pointer">
              <summary className="font-semibold text-gray-700 mb-2">
                Extracted Text Preview (for TTS & AI)
              </summary>
              <div className="mt-2 p-4 bg-white rounded border text-sm text-gray-600 max-h-40 overflow-auto whitespace-pre-wrap">
                {extractedText}
              </div>
            </details>
          </div>
        )}
      </div>
    </div>
  );
};

export default PDFViewer;