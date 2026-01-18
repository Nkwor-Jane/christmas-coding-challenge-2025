import { useState, useEffect } from 'react';
import { AlertCircle } from 'lucide-react';
import PDFUploader from './components/PDFUploader';
import PDFViewer from './components/PDFViewer';
import ThemeToggle from './components/ThemeToggle';

interface PDFData {
  name: string;
  size: number;
  url: string;
  file: File;
}

interface StoredPDFData {
  name: string;
  size: number;
  url: string;
  pdfId?: string;
  uploadedAt: string;
}
function App() {
  const [pdfData, setPdfData] = useState<PDFData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pdfId, setPdfId] = useState<string | null>(null);

  // Load from localStorage on mount
  useEffect(() => {
    const savedData = localStorage.getItem('currentPDF');
    if (savedData) {
      try {
        const parsed: StoredPDFData = JSON.parse(savedData);
        
        // Check if data is recent (24 hours)
        const uploadTime = new Date(parsed.uploadedAt).getTime();
        const now = new Date().getTime();
        const hoursSince = (now - uploadTime) / (1000 * 60 * 60);
        
        if (hoursSince < 24) {
          setPdfId(parsed.pdfId || null);
        } else {
          // Clear old data
          localStorage.removeItem('currentPDF');
        }
      } catch (err) {
        console.error('Failed to restore PDF data:', err);
        localStorage.removeItem('currentPDF');
      }
    }
  }, []);


  const handlePDFUpload = (data: PDFData): void => {
    setPdfData(data);
    setError(null);

    // Save to localStorage (without File object)
    const toSave: StoredPDFData = {
      name: data.name,
      size: data.size,
      url: data.url,
      uploadedAt: new Date().toISOString()
    };
    localStorage.setItem('currentPDF', JSON.stringify(toSave));
  };

  const handlePDFIdReceived = (id: string) => {
    setPdfId(id);
    
    // Update localStorage with pdf_id
    const savedData = localStorage.getItem('currentPDF');
    if (savedData) {
      const parsed = JSON.parse(savedData);
      parsed.pdfId = id;
      localStorage.setItem('currentPDF', JSON.stringify(parsed));
    }
  };

  const handleError = (errorMessage: string): void => {
    setError(errorMessage);
    setTimeout(() => setError(null), 5000);
  };

  const handleClose = (): void => {
    setPdfData(null);
    setPdfId(null);
    localStorage.removeItem('currentPDF');
  };
  
  return (
    <div className="
        min-h-screen
        bg-gradient-to-br from-blue-50 to-indigo-100
        dark:from-gray-900 dark:to-gray-800
        text-gray-900 dark:text-gray-100
        transition-colors duration-300
        p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2 dark:text-white">
            🎧 AI-Powered PDF Reader
          </h1>
          <ThemeToggle />
          <p className="text-gray-600 dark:text-gray-300">
            Upload a PDF to listen and ask questions
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-100  dark:bg-red-900 border border-red-300 dark:border-red-700 rounded-lg flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 dark:text-red-400" />
            <p className="text-red-700 dark:text-red-300">{error}</p>
          </div>
        )}

        {/* Main Content */}
        {!pdfData ? (
          <div className="max-w-2xl mx-auto">
            <PDFUploader 
              onPDFUpload={handlePDFUpload}
       
              onError={handleError}
            />
            
            {/* Features Info */}
            <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-4 rounded-lg shadow-sm text-center dark:bg-gray-800">
                <div className="text-3xl mb-2">🔊</div>
                <h3 className="font-semibold text-gray-800 mb-1 dark:text-white">Listen</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Text-to-speech narration</p>
              </div>
              <div className="bg-white p-4 rounded-lg shadow-sm text-center dark:bg-gray-800">
                <div className="text-3xl mb-2">💬</div>
                <h3 className="font-semibold text-gray-800 mb-1 dark:text-white">Ask</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">AI-powered Q&A</p>
              </div>
              <div className="bg-white p-4 rounded-lg shadow-sm text-center dark:bg-gray-800">
                <div className="text-3xl mb-2">📖</div>
                <h3 className="font-semibold text-gray-800 mb-1 dark:text-white">Learn</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Interactive reading</p>
              </div>
            </div>
          </div>
        ) : (
          <PDFViewer 
            pdfData={pdfData}
            pdfId={pdfId ?? undefined} 
            onClose={handleClose}
            onPDFIdReceived={handlePDFIdReceived}
          />
        )}
      </div>
    </div>
  );
}

export default App;