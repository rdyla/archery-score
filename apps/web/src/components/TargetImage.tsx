import { useState, useEffect, useRef } from 'react';
import { useApi } from '../hooks/useApi';

interface TargetImageProps {
  imageUrl: string;
  className?: string;
}

export function TargetImage({ imageUrl, className }: TargetImageProps) {
  const api = useApi();
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const prevObjectUrl = useRef<string | null>(null);

  useEffect(() => {
    if (!api || !imageUrl) return;
    let cancelled = false;

    api.getBlob(imageUrl).then((url) => {
      if (cancelled) {
        URL.revokeObjectURL(url);
        return;
      }
      if (prevObjectUrl.current) URL.revokeObjectURL(prevObjectUrl.current);
      prevObjectUrl.current = url;
      setObjectUrl(url);
    }).catch(() => setError(true));

    return () => { cancelled = true; };
  }, [imageUrl, api]);

  if (error) return null;

  if (!objectUrl) {
    return (
      <div className={`bg-gray-800 animate-pulse rounded-xl ${className ?? 'w-full aspect-square'}`} />
    );
  }

  return (
    <img
      src={objectUrl}
      alt="Target"
      className={`rounded-xl object-contain ${className ?? 'w-full'}`}
    />
  );
}
