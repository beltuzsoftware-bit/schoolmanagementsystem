'use client';

import React, { useState, useCallback } from 'react';
import Cropper, { Point, Area } from 'react-easy-crop';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Slider } from '@/components/ui/slider';
import { Crop, ZoomIn, RotateCw } from 'lucide-react';

interface ImageCropperProps {
    image: string | null;
    open: boolean;
    onClose: () => void;
    onCropComplete: (croppedImage: string) => void;
    aspect?: number;
    initialAspect?: number;
}

export default function ImageCropper({ image, open, onClose, onCropComplete, aspect = 3 / 4 }: ImageCropperProps) {
    const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [rotation, setRotation] = useState(0);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

    const onCropChange = (crop: Point) => {
        setCrop(crop);
    };

    const onZoomChange = (zoom: number) => {
        setZoom(zoom);
    };

    const onCropCompleteInternal = useCallback((_croppedArea: Area, croppedAreaPixels: Area) => {
        setCroppedAreaPixels(croppedAreaPixels);
    }, []);

    const createImage = (url: string): Promise<HTMLImageElement> =>
        new Promise((resolve, reject) => {
            const image = new Image();
            image.addEventListener('load', () => resolve(image));
            image.addEventListener('error', (error) => reject(error));
            if (url && !url.startsWith('data:')) {
                image.setAttribute('crossOrigin', 'anonymous');
            }
            image.src = url;
        });

    const getCroppedImg = async (imageSrc: string, pixelCrop: Area, rotation = 0): Promise<string> => {
        const image = await createImage(imageSrc);
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (!ctx) return '';

        const rotRad = (rotation * Math.PI) / 180;
        const { width: bWidth, height: bHeight } = {
            width: Math.abs(Math.cos(rotRad) * image.width) + Math.abs(Math.sin(rotRad) * image.height),
            height: Math.abs(Math.sin(rotRad) * image.width) + Math.abs(Math.cos(rotRad) * image.height),
        };

        canvas.width = bWidth;
        canvas.height = bHeight;

        ctx.translate(bWidth / 2, bHeight / 2);
        ctx.rotate(rotRad);
        ctx.translate(-image.width / 2, -image.height / 2);

        ctx.drawImage(image, 0, 0);

        const cropCanvas = document.createElement('canvas');
        const cropCtx = cropCanvas.getContext('2d');

        cropCanvas.width = pixelCrop.width;
        cropCanvas.height = pixelCrop.height;

        cropCtx?.drawImage(
            canvas,
            pixelCrop.x,
            pixelCrop.y,
            pixelCrop.width,
            pixelCrop.height,
            0,
            0,
            pixelCrop.width,
            pixelCrop.height
        );

        return cropCanvas.toDataURL('image/png');
    };

    const handleSave = async () => {
        if (!image || !croppedAreaPixels) return;

        try {
            const croppedImage = await getCroppedImg(image, croppedAreaPixels, rotation);
            onCropComplete(croppedImage);
            onClose();
        } catch (e) {
            console.error(e);
            toast.error('Failed to crop image');
        }
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden bg-white border-slate-200 text-slate-900">
                <DialogHeader className="p-6 pb-0">
                    <DialogTitle className="flex items-center gap-2 text-slate-800">
                        <Crop className="h-5 w-5 text-indigo-600" />
                        Adjust Photo Selection
                    </DialogTitle>
                </DialogHeader>

                <div className="relative h-[400px] w-full bg-slate-100 mt-4 border-y border-slate-200 overflow-hidden">
                    {image && (
                        <Cropper
                            image={image}
                            crop={crop}
                            zoom={zoom}
                            rotation={rotation}
                            aspect={aspect || undefined}
                            onCropChange={onCropChange}
                            onCropComplete={onCropCompleteInternal}
                            onZoomChange={onZoomChange}
                            showGrid={true}
                        />
                    )}
                </div>

                <div className="p-6 space-y-6">
                    <div className="space-y-4">
                        <div className="flex items-center gap-4">
                            <ZoomIn className="h-4 w-4 text-slate-400" />
                            <Slider
                                value={[zoom]}
                                min={1}
                                max={3}
                                step={0.1}
                                onValueChange={(v: number[]) => setZoom(v[0])}
                                className="flex-1"
                            />
                        </div>
                        <div className="flex items-center gap-4">
                            <RotateCw className="h-4 w-4 text-slate-400" />
                            <Slider
                                value={[rotation]}
                                min={0}
                                max={360}
                                step={1}
                                onValueChange={(v: number[]) => setRotation(v[0])}
                                className="flex-1"
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="ghost" onClick={onClose} className="text-slate-500 hover:text-slate-700 hover:bg-slate-100">
                            Cancel
                        </Button>
                        <Button onClick={handleSave} className="bg-indigo-600 hover:bg-indigo-700 shadow-md">
                            Apply Selection
                        </Button>
                    </DialogFooter>
                </div>
            </DialogContent>
        </Dialog>
    );
}
