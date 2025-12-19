import React, {useState, useRef} from 'react';
import { Upload} from 'lucide-react'; 

interface PDFData {
    file: File;
    name: string;
    size: number;
    url: string;
}

interface PDFUploaderProps {
    onPDFUpload: (data: PDFData) => void;
    onError?: (message: string) => void;
}

const PDFUploader: React.FC<PDFUploaderProps> = ({ onPDFUpload, onError }) => {
        const [isDragging, setIsDragging] = useState<boolean>(false);
        const fileInputRef = useRef<HTMLInputElement | null>(null);

        const handleDragOver = (e: React.DragEvent<HTMLDivElement>): void => {
                e.preventDefault();
                setIsDragging(true);
        };
        
        const handleDragLeave = (e: React.DragEvent<HTMLDivElement>): void => {
                e.preventDefault();
                setIsDragging(false);
        };
        
        const handleDrop = (e: React.DragEvent<HTMLDivElement>): void => {
                e.preventDefault();
                setIsDragging(false);
                const files: FileList = e.dataTransfer.files;
                if (files.length > 0) {
                        handleFile(files[0]);
                }
        };
        
        const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>): void => {
                const files = e.target.files;
                if (files && files.length > 0) {
                        handleFile(files[0]); 
                }
        };
        
        const handleFile = (file: File): void => {
            // Validate file type
            if(file.type !== "application/pdf"){
                onError?.("Please upload a valid PDF file.");
                return;
            }
            
            // Validate file size (10MB max)
            const maxSize: number = 10 * 1024 * 1024;
            if (file.size > maxSize) {
                onError?.("File size exceeds 10MB.");
                return;
            }
            
            // Read file and convert to data URL
            const reader = new FileReader();
            reader.onload = (e: ProgressEvent<FileReader>) => {
                onPDFUpload({
                    file: file,
                    name: file.name,
                    size: file.size,
                    url: (e.target?.result as string)
                });
            };
            reader.onerror = () => {
                onError?.("Failed to read the file.");
            };
            reader.readAsDataURL(file);
        };
        
        const handleClick = (): void => {
                fileInputRef.current?.click();
        };
        
        return (
                <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-all cursor-pointer
                ${isDragging 
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                    : 'border-gray-300 hover:border-gray-500 dark:hover:border-gray-600 bg-white dark:bg-gray-800'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={handleClick}
        >
                <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                onChange={handleFileInput}
                className="hidden"
            />
            <div className="flex flex-col items-center gap-4">
                <div className={`p-4 rounded-full dark:border-gray-200 ${isDragging ? 'bg-blue-100 dark:bg-blue-900/20' : 'bg-gray-100 dark:bg-gray-800'}`}>
                    <Upload className={`w-12 h-12 ${isDragging ? 'text-blue-500' : 'text-gray-400'}`} />
                </div>
                
                <div>
                    <p className="text-lg font-semibold text-gray-700 mb-1 dark:text-gray-100">
                        {isDragging ? 'Drop your PDF here' : 'Upload PDF Document'}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-300">
                        Drag and drop or click to browse (Max 10MB)
                    </p>
                </div>
                
                <button
                    className="px-6 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors cursor-pointer"
                    onClick={(e) => {
                        e.stopPropagation();
                        handleClick();
                    }}
                >
                    Choose File
                </button>
            </div>
        </div>
        );
};

export default PDFUploader;