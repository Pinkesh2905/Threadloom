import { useEffect, useState } from 'react';

/** Loads a URL into an HTMLImageElement for Konva's <Image> node. */
export function useHtmlImage(url?: string): HTMLImageElement | undefined {
  const [image, setImage] = useState<HTMLImageElement | undefined>(undefined);

  useEffect(() => {
    if (!url) {
      setImage(undefined);
      return;
    }
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.src = url;
    img.onload = () => setImage(img);
    return () => {
      img.onload = null;
    };
  }, [url]);

  return image;
}
