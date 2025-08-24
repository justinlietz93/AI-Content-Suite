
import React, { useCallback, useState } from 'react';
import { UploadIcon } from './icons/UploadIcon';
import type { Mode } from '../types';

interface FileLoaderProps {
  onFileSelect: (files: File[]) => void;
  selectedFiles: File[] | null;
  mode: Mode;
}

export const FileLoader: React.FC<FileLoaderProps> = ({ onFileSelect, selectedFiles, mode }) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      onFileSelect(Array.from(event.target.files));
    }
  };

  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
    if (event.dataTransfer.files && event.dataTransfer.files.length > 0) {
      onFileSelect(Array.from(event.dataTransfer.files));
    }
  }, [onFileSelect]);

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
  }, []);

  const handleDragEnter = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
  }, []);
  
  const openFileDialog = () => {
    document.getElementById('fileInput')?.click();
  };

  const hasFiles = selectedFiles && selectedFiles.length > 0;
  const acceptTypes = mode === 'rewriter'
    ? ".txt,.md,text/plain,text/markdown,image/png,image/jpeg,image/webp"
    : ".txt,.md,text/plain,text/markdown";

  const supportedFormatsText = mode === 'rewriter'
    ? "(Supported formats: .txt, .md, .png, .jpg, .webp)"
    : "(Supported formats: .txt, .md)";


  return (
    <div className="w-full p-4 sm:p-6">
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onClick={openFileDialog}
        className={`flex flex-col items-center justify-center w-full min-h-[16rem] sm:min-h-[20rem] p-4 border-2 border-dashed rounded-xl cursor-pointer transition-all duration-200
                    ${isDragging ? 'border-primary bg-sky-900 scale-105' : 'border-border-color hover:border-sky-500'}
                    ${hasFiles ? 'border-green-500 bg-green-900/50' : ''} `}
      >
        <input
          type="file"
          id="fileInput"
          className="hidden"
          onChange={handleFileChange}
          accept={acceptTypes} 
          multiple
        />
        <UploadIcon className={`w-12 h-12 sm:w-16 sm:h-16 mb-4 transition-colors duration-200 ${isDragging ? 'text-primary' : hasFiles ? 'text-green-400' : 'text-text-secondary'}`} />
        {hasFiles ? (
          <>
            <p className="text-lg sm:text-xl font-semibold text-green-300">{selectedFiles.length} item(s) selected</p>
            <p className="text-xs sm:text-sm text-green-400">
              Total size: {(selectedFiles.reduce((total, file) => total + file.size, 0) / (1024 * 1024)).toFixed(2)} MB
            </p>
            <div className="w-full max-h-24 overflow-y-auto mt-2 text-xs text-slate-300 text-left px-4">
              <ul className="list-disc list-inside space-y-1">
                {selectedFiles.map((file, index) => <li key={`${file.name}-${index}`}>{file.name}</li>)}
              </ul>
            </div>
            <p className="text-xs sm:text-sm text-text-secondary mt-2">Click again or drop files to change selection.</p>
          </>
        ) : (
          <>
            <p className="text-lg sm:text-xl font-semibold text-text-primary">Drag & drop your content here</p>
            <p className="text-sm text-text-secondary mt-1">or click to select</p>
            <p className="text-xs text-text-secondary mt-3">{supportedFormatsText}</p>
          </>
        )}
      </div>
    </div>
  );
};