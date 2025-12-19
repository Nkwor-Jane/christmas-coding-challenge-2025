import React, { useState, useRef, useEffect } from 'react';
import { FileText, X, AlertCircle } from 'lucide-react';
import AudioControls from './AudioControls';

import * as pdfjsLib from 'pdfjs-dist';
import { pdfWorkerUrl }from '../utils/pdfWorker';
import ChatInterface from './ChatInterface';

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
  onPDFIdReceived?: (pdfId: string) => void;
}

const PDFViewer: React.FC<PDFViewerProps> = ({ pdfData, onClose, onTextExtracted, onPDFIdReceived }) => {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [extractedText, setExtractedText] = useState<string>('');
  const [pdfObjectUrl, setPdfObjectUrl] = useState<string>('');
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [pagesText, setPagesText] = useState<string[]>([]);
  const [selectedPage, setSelectedPage] = useState<number>(0);
  const [isExtracting, setIsExtracting] = useState<boolean>(false);
  const [fullPDFText, setFullPDFText] = useState<string>('');
  const [pdfId, setPdfId] = useState<string | null>(null);


    useEffect(() => {
    if (pdfData?.file) {
      // Create object URL for the PDF file
      const objectUrl = URL.createObjectURL(pdfData.file);
      setPdfObjectUrl(objectUrl);
      
      setIsExtracting(true);

      // Upload PDF to backend and extract text in parallel
      Promise.all([
        uploadPDFToBackend(pdfData.file),
        extractPDFText(pdfData.file)
      ])
        .then(([id, { pages }]) => {
          // Handle PDF upload
          setPdfId(id);
          // console.log('PDF uploaded, ID:', id);
          
          // Notify parent component
          if (onPDFIdReceived) {
            onPDFIdReceived(id);
          }

          // Handle text extraction
          setPagesText(pages);
          setExtractedText(pages[0]);
          
          const combinedText = pages.map((text, idx) => 
            `--- Page ${idx + 1} ---\n\n${text}`
          ).join('\n\n');
          setFullPDFText(combinedText);

          // Notify parent of extracted text
          if (onTextExtracted) {
            onTextExtracted(combinedText);
          }

          // Save to localStorage for persistence
          saveToLocalStorage({
            pdfId: id,
            name: pdfData.name,
            size: pdfData.size,
            pages: pages.length,
            fullText: combinedText
          });
        })
        .catch((err) => {
          console.error('Error processing PDF:', err);
          setError('Failed to process PDF.');
        })
        .finally(() => {
          setIsLoading(false);
          setIsExtracting(false);
        });
        
      return () => {
        URL.revokeObjectURL(objectUrl);
      };
    }
  }, [pdfData, onTextExtracted, onPDFIdReceived]);


  // Load from localStorage on mount
  useEffect(() => {
    const loadSavedPDF = () => {
      const savedPDF = localStorage.getItem('currentPDF');
      if (savedPDF && !pdfData) {
        try {
          const parsed = JSON.parse(savedPDF);
          console.log('Found saved PDF in localStorage:', parsed.name);
          
          // Check if it's recent (within 24 hours)
          const savedTime = new Date(parsed.savedAt).getTime();
          const now = new Date().getTime();
          const hoursSince = (now - savedTime) / (1000 * 60 * 60);
          
          if (hoursSince < 24) {
            setPdfId(parsed.pdfId);
            setFullPDFText(parsed.fullText);
            console.log('Restored PDF data from localStorage');
          } else {
            console.log('Saved PDF is too old, clearing...');
            localStorage.removeItem('currentPDF');
          }
        } catch (err) {
          console.error('Failed to load saved PDF:', err);
          localStorage.removeItem('currentPDF');
        }
      }
    };

    loadSavedPDF();
  }, [pdfData]);

  // Save to localStorage
  const saveToLocalStorage = (data: {
    pdfId: string;
    name: string;
    size: number;
    pages: number;
    fullText: string;
  }) => {
    try {
      const toSave = {
        ...data,
        savedAt: new Date().toISOString()
      };
      localStorage.setItem('currentPDF', JSON.stringify(toSave));
    } catch (err) {
      console.error('Failed to save to localStorage:', err);
    }
  };

  // UPLOAD PDF TO BACKEND
  const uploadPDFToBackend = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch('http://localhost:8000/api/pdf/upload', {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      throw new Error('Failed to upload PDF');
    }

    const data = await response.json();
    return data.pdf_id;
  };

  // Extract PDF
  const extractPDFText = async (file: File): Promise<{ pages: string[] }> => {
    const typedArray = new Uint8Array(await file.arrayBuffer());
    const pdf = await pdfjsLib.getDocument({ data: typedArray }).promise;

    const pages: string[] = [];

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();

      let text = '';
      let lastX = 0;

      for (const item of content.items as any[]){
        const str =  item.str;
        //Detetct spacing
        const x = item.transform[4];
        const isSpace = Math.abs(x - lastX) > 5;

        if (isSpace) text += ' ';

        text += str;
        lastX = x;
      }

      text = text
        .replace(/\s+([.,!?;:])/g, '$1')      // remove space before punctuation
        .replace(/([({[])\s+/g, '$1')         // remove space after opening bracket
        .replace(/\s+([)}\]])/g, '$1')        // remove space before closing bracket
        .replace(/\s{2,}/g, ' ')              // collapse double spaces
        .trim();

      pages.push(text);
    }

    return { pages };
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const handleClose = () => {
    // Clear localStorage when closing
    localStorage.removeItem('currentPDF');
    onClose();
  };

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
            onClick={handleClose}
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
          <div className="bg-gray-100 dark:bg-gray-700 p-4" style={{ height: '400px' }}>
            <div className="bg-white dark:bg-gray-400 rounded shadow-md h-full overflow-hidden">
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
          {/* Page Selector*/}
          {pagesText.length > 0 && (
            <div className="p-4 bg-white dark:bg-gray-400 rounded-lg shadow">
              <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Start reading from page:
              </label>

              <select
                value={selectedPage}
                onChange={(e) => {
                  const pageIndex = Number(e.target.value);
                  setSelectedPage(pageIndex);
                  setExtractedText(pagesText[pageIndex]);
                }}
                className="w-full border p-3 rounded bg-gray-800 dark:bg-gray-600"
              >
                {pagesText.map((_, i) => (
                  <option key={i} value={i} className="text-white">
                    Page {i + 1}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Audio Controls Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {extractedText && (
        <AudioControls 
          text={extractedText} 
        />
      )}

       <ChatInterface 
          pdfContext={fullPDFText}
          pdfName={pdfData.name}
          pdfId={pdfId || undefined} 
          isEnabled={!!fullPDFText && !isExtracting}
        />
      </div>
      
      {/* Status message */}
      {!fullPDFText && !isExtracting && !error && (
        <div className="bg-yellow-50 border border-yellow-200 dark:bg-yellow-600 dark:border-yellow-500 rounded-lg p-4">
          <p className="text-yellow-800 text-sm dark:text-yellow-200">
            No text could be extracted from this PDF. It may be a scanned document or image-based PDF.
          </p>
        </div>
      )}

      {/* Extracted Text Preview -- Preview the full pdf  */}
      {fullPDFText && (
        <div className="bg-white dark:bg-gray-400 rounded-lg shadow-lg p-4">
          <details className="cursor-pointer">
            <summary className="font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center justify-between">
              <span>Full PDF Text ({fullPDFText.split(' ').length} words, {pagesText.length} pages)</span>
              <span className="text-sm text-gray-500">Click to expand</span>
            </summary>
            <div className="mt-2 p-4 bg-gray-50 dark:bg-gray-600 rounded border text-sm text-gray-600 dark:text-gray-300 max-h-60 overflow-auto whitespace-pre-wrap">
              {fullPDFText}
            </div>
          </details>
        </div>
      )}
    </div>
  );
};

export default PDFViewer;