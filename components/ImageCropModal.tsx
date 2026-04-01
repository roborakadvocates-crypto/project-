
import React, { useState, useCallback } from 'react';
import Cropper, { Point, Area } from 'react-easy-crop';
import { X, Check, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

interface ImageCropModalProps {
  image: string;
  onCropComplete: (croppedImage: string) => void;
  onClose: () => void;
  language: 'ar' | 'en';
}

const ImageCropModal: React.FC<ImageCropModalProps> = ({ image, onCropComplete, onClose, language }) => {
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  const onCropChange = (crop: Point) => setCrop(crop);
  const onZoomChange = (zoom: number) => setZoom(zoom);

  const onCropCompleteInternal = useCallback((_croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const createImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const image = new Image();
      image.addEventListener('load', () => resolve(image));
      image.addEventListener('error', (error) => reject(error));
      image.setAttribute('crossOrigin', 'anonymous');
      image.src = url;
    });

  const getCroppedImg = async (imageSrc: string, pixelCrop: Area): Promise<string> => {
    const image = await createImage(imageSrc);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) return '';

    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;

    ctx.drawImage(
      image,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      pixelCrop.width,
      pixelCrop.height
    );

    return canvas.toDataURL('image/jpeg', 0.9);
  };

  const handleSave = async () => {
    if (croppedAreaPixels) {
      const croppedImage = await getCroppedImg(image, croppedAreaPixels);
      onCropComplete(croppedImage);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl animate-in fade-in duration-300">
      <div className="relative bg-dark-900 border border-gold-600/30 rounded-3xl w-full max-w-3xl h-[85vh] flex flex-col shadow-[0_0_100px_rgba(184,134,46,0.15)] overflow-hidden">
        
        {/* Header */}
        <div className="p-6 border-b border-gray-800 flex justify-between items-center bg-dark-950/50">
          <h3 className="text-xl font-bold text-white flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gold-600/10 flex items-center justify-center border border-gold-600/20">
               <RotateCcw className="w-4 h-4 text-gold-500" />
            </div>
            {language === 'ar' ? 'قص الصورة' : 'Crop Image'}
          </h3>
          <button onClick={onClose} className="p-2 text-gray-500 hover:text-white transition-colors bg-white/5 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cropper Container */}
        <div className="flex-grow relative bg-black/40">
          <Cropper
            image={image}
            crop={crop}
            zoom={zoom}
            aspect={1}
            onCropChange={onCropChange}
            onCropComplete={onCropCompleteInternal}
            onZoomChange={onZoomChange}
            objectFit="contain"
          />
        </div>

        {/* Footer Controls */}
        <div className="p-8 bg-dark-950/80 border-t border-gray-800 space-y-6">
          <div className="flex items-center gap-6">
             <ZoomOut className="w-5 h-5 text-gray-600" />
             <input
                type="range"
                value={zoom}
                min={1}
                max={3}
                step={0.1}
                aria-labelledby="Zoom"
                onChange={(e) => setZoom(Number(e.target.value))}
                className="flex-grow h-1.5 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-gold-500"
              />
              <ZoomIn className="w-5 h-5 text-gray-600" />
          </div>

          <div className="flex justify-end gap-4">
            <button 
                onClick={onClose} 
                className="px-8 py-3 rounded-xl text-gray-400 font-bold hover:bg-white/5 transition-all"
            >
                {language === 'ar' ? 'إلغاء' : 'Cancel'}
            </button>
            <button 
                onClick={handleSave} 
                className="bg-gold-600 hover:bg-gold-500 text-black font-black px-10 py-3 rounded-xl shadow-xl shadow-gold-600/20 flex items-center gap-2 transition-all group"
            >
                <Check className="w-5 h-5 group-hover:scale-110 transition-transform" />
                {language === 'ar' ? 'تأكيد القص' : 'Confirm Crop'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageCropModal;
