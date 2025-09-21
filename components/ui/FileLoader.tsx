

import React, { useCallback, useMemo, useState } from 'react';
import { UploadIcon } from '../icons/UploadIcon';
import type { Mode } from '../../types';

interface FileLoaderProps {
  onFileSelect: (files: File[]) => void;
  selectedFiles: File[] | null;
  mode: Mode;
}

/**
 * Presents an adaptive drag-and-drop area for file ingestion. The loader keeps the drop
 * affordance available on all screen sizes while dynamically clamping its height to avoid
 * overwhelming the surrounding form controls on shorter viewports. The component relies on
 * local DOM drag events only and therefore has no timeout or retry semantics.
 */
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
  
  const getAcceptTypes = () => {
    switch(mode) {
        case 'rewriter':
        case 'chat':
            return ".txt,.md,text/plain,text/markdown,image/png,image/jpeg,image/webp,application/pdf,.js,.ts,.jsx,.tsx,.py,.html,.css,.json,.xml,.yaml,.yml";
        default:
            return ".txt,.md,text/plain,text/markdown,application/pdf";
    }
  }

  const getSupportedFormatsText = () => {
     switch(mode) {
        case 'rewriter':
        case 'chat':
            return "(Text, Markdown, PDF, Code, and Image files supported)";
        default:
            return "(Supported formats: .txt, .md, .pdf)";
    }
  }
  
  const acceptTypes = getAcceptTypes();
  const supportedFormatsText = getSupportedFormatsText();

  const dropZoneStyle = useMemo(
    () => ({
      minHeight: hasFiles ? 'clamp(12rem, 30vh, 20rem)' : 'clamp(9rem, 24vh, 16rem)',
      maxHeight: hasFiles ? 'min(24rem, 40vh)' : 'min(20rem, 32vh)',
    }),
    [hasFiles],
  );


  return (
    <div className="w-full px-4 pb-4 sm:px-6 sm:pb-6">
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onClick={openFileDialog}
        style={dropZoneStyle}
        className={`flex flex-col items-center justify-center w-full p-4 sm:p-5 lg:p-6 border-2 border-dashed rounded-xl cursor-pointer transition-all duration-200
                    ${isDragging ? 'border-primary bg-primary/20 scale-[1.01]' : 'border-border-color hover:border-primary'}
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
        <UploadIcon className={`w-10 h-10 sm:w-14 sm:h-14 lg:w-16 lg:h-16 mb-4 transition-colors duration-200 ${isDragging ? 'text-primary' : hasFiles ? 'text-green-400' : 'text-text-secondary'}`} />
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