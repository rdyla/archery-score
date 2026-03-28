import { useRef, useState, useCallback } from 'react';
import { Camera, Upload, RefreshCw, CheckCircle } from 'lucide-react';
import { Button } from './ui/Button';
import { clsx } from 'clsx';

interface CameraCaptureProps {
  onCapture: (file: File) => void;
  disabled?: boolean;
}

export function CameraCapture({ onCapture, disabled }: CameraCaptureProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [capturedFile, setCapturedFile] = useState<File | null>(null);

  const handleFile = useCallback(
    (file: File) => {
      const url = URL.createObjectURL(file);
      setPreview(url);
      setCapturedFile(file);
    },
    []
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    // Reset so same file can be selected again
    e.target.value = '';
  };

  const handleConfirm = () => {
    if (capturedFile) {
      onCapture(capturedFile);
      setPreview(null);
      setCapturedFile(null);
    }
  };

  const handleRetake = () => {
    setPreview(null);
    setCapturedFile(null);
    fileInputRef.current?.click();
  };

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Hidden file input — accepts camera on mobile */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleInputChange}
        className="hidden"
      />

      {preview ? (
        <div className="w-full space-y-3">
          <div className="relative rounded-xl overflow-hidden bg-gray-800 aspect-video">
            <img src={preview} alt="Target preview" className="w-full h-full object-contain" />
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={handleRetake} className="flex-1" size="md">
              <RefreshCw size={18} className="mr-2" />
              Retake
            </Button>
            <Button onClick={handleConfirm} className="flex-1" size="md">
              <CheckCircle size={18} className="mr-2" />
              Use this photo
            </Button>
          </div>
        </div>
      ) : (
        <div className="w-full space-y-3">
          <button
            disabled={disabled}
            onClick={() => {
              if (fileInputRef.current) {
                // Use camera capture on mobile
                fileInputRef.current.setAttribute('capture', 'environment');
                fileInputRef.current.click();
              }
            }}
            className={clsx(
              'w-full aspect-video rounded-xl border-2 border-dashed border-gray-700',
              'flex flex-col items-center justify-center gap-3',
              'hover:border-brand-500 hover:bg-gray-800/50 transition-all tap-highlight-none',
              'active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            <Camera size={40} className="text-gray-600" />
            <span className="text-gray-500 font-medium">Tap to photograph target</span>
            <span className="text-xs text-gray-600">AI will score the arrows automatically</span>
          </button>

          <button
            disabled={disabled}
            onClick={() => {
              if (fileInputRef.current) {
                fileInputRef.current.removeAttribute('capture');
                fileInputRef.current.click();
              }
            }}
            className="w-full flex items-center justify-center gap-2 py-2 text-sm text-gray-500 hover:text-gray-300 tap-highlight-none"
          >
            <Upload size={16} />
            Or upload from gallery
          </button>
        </div>
      )}
    </div>
  );
}
