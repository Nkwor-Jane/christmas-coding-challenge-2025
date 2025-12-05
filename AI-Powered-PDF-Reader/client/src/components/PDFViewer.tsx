import React, { useState, useRef, useEffect } from 'react';
import { FileText, X, AlertCircle } from 'lucide-react';
import AudioControls from './AudioControls';

import * as pdfjsLib from 'pdfjs-dist';
import { pdfWorkerUrl }from '../utils/pdfWorker';

// Enable worker
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;


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
     extractPDFText(pdfData.file)
      .then((text) =>{
        setExtractedText(text);
        onTextExtracted?.(text);
      })
      .catch((err)=>{
        console.error(err);
        setError('Failed to extract text from PDF.')
      })
      .finally(() =>{
        setIsLoading(false);
      })
      return () => {
        URL.revokeObjectURL(objectUrl);
      };
    }
  }, [pdfData]);

  // Extract PDF
  const extractPDFText = async (file: File): Promise<string> => {
    const typedArray = new Uint8Array(await file.arrayBuffer());
    const pdf = await pdfjsLib.getDocument({ data: typedArray }).promise;

    let fullText = '';

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();

      const pageText = content.items
        .map((item: any) => item.str)
        .join(' ');

      fullText += pageText + '\n\n';
    }

    return fullText;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  // const handleReadingPositionChange = (position: number) => {
  //   // setCurrentReadingPosition(position);
  // };

  if (!pdfData) return null;

  return (
    <div className="space-y-4">
      {/* PDF Viewer Section */}
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
          <div className="bg-gray-100 p-4" style={{ height: '400px' }}>
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
        </div>
      </div>

      {/* Audio Controls Section */}
      {extractedText && (
        <AudioControls 
          text={extractedText} 
        />
      )}

      {/* Extracted Text Preview */}
      {extractedText && (
        <div className="bg-white rounded-lg shadow-lg p-4">
          <details className="cursor-pointer">
            <summary className="font-semibold text-gray-700 mb-2">
              Full Text Preview
            </summary>
            <div className="mt-2 p-4 bg-gray-50 rounded border text-sm text-gray-600 max-h-60 overflow-auto whitespace-pre-wrap">
              {extractedText}
            </div>
          </details>
        </div>
      )}
    </div>
  );
};

export default PDFViewer;