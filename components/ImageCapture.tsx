import React, { useState, useRef, useCallback } from 'react';
import Webcam from 'react-webcam';
import { Camera, Upload, RefreshCcw, X, Check, Trash2 } from 'lucide-react';

interface ImageCaptureProps {
    onImageCaptured: (image: string) => void;
    currentImage?: string;
    label?: string;
    aspectRatio?: 'square' | 'video' | 'portrait';
    className?: string;
}

export const ImageCapture: React.FC<ImageCaptureProps> = ({
    onImageCaptured,
    currentImage,
    label = "Image",
    aspectRatio = 'square',
    className = ""
}) => {
    const [isWebcamOpen, setIsWebcamOpen] = useState(false);
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const webcamRef = useRef<Webcam>(null);

    const videoConstraints = {
        facingMode: 'user',
        aspectRatio: aspectRatio === 'square' ? 1 : aspectRatio === 'video' ? 16 / 9 : 3 / 4,
    };

    const handleCapture = useCallback(() => {
        const imageSrc = webcamRef.current?.getScreenshot();
        if (imageSrc) {
            setCapturedImage(imageSrc);
        }
    }, [webcamRef]);

    const handleRetake = () => {
        setCapturedImage(null);
    };

    const handleSave = () => {
        if (capturedImage) {
            onImageCaptured(capturedImage);
            setIsWebcamOpen(false);
            setCapturedImage(null);
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                onImageCaptured(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleRemove = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        onImageCaptured('');
    };

    const ratioClasses = {
        square: 'aspect-square',
        video: 'aspect-video',
        portrait: 'aspect-[3/4]',
    };

    return (
        <div className={`space-y-2 ${className}`}>
            {label && <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest block mb-2">{label}</label>}

            <div className={`relative group w-full ${ratioClasses[aspectRatio]} rounded-3xl bg-stone-50 border-2 border-dashed border-stone-200 flex items-center justify-center overflow-hidden transition-all hover:border-purple-300`}>
                {currentImage ? (
                    <>
                        <img src={currentImage} className="w-full h-full object-cover" alt="Captured" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            <button
                                type="button"
                                onClick={() => setIsWebcamOpen(true)}
                                className="p-2 bg-white rounded-xl text-purple-600 hover:bg-purple-50 transition shadow-lg"
                                title="Change with Camera"
                            >
                                <Camera size={18} />
                            </button>
                            <label className="p-2 bg-white rounded-xl text-purple-600 hover:bg-purple-50 transition cursor-pointer shadow-lg" title="Upload New File">
                                <Upload size={18} />
                                <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
                            </label>
                            <button
                                type="button"
                                onClick={handleRemove}
                                className="p-2 bg-white rounded-xl text-rose-600 hover:bg-rose-50 transition shadow-lg"
                                title="Remove Image"
                            >
                                <Trash2 size={18} />
                            </button>
                        </div>
                    </>
                ) : (
                    <div className="flex flex-col items-center gap-3">
                        <div className="flex gap-4">
                            <button
                                type="button"
                                onClick={() => setIsWebcamOpen(true)}
                                className="flex flex-col items-center gap-1 group/btn"
                            >
                                <div className="w-12 h-12 rounded-2xl bg-white border border-stone-100 flex items-center justify-center text-stone-400 group-hover/btn:text-purple-600 group-hover/btn:border-purple-200 transition-all shadow-sm">
                                    <Camera size={20} />
                                </div>
                                <span className="text-[8px] font-bold text-stone-400 uppercase tracking-wider">Camera</span>
                            </button>

                            <label className="flex flex-col items-center gap-1 cursor-pointer group/btn">
                                <div className="w-12 h-12 rounded-2xl bg-white border border-stone-100 flex items-center justify-center text-stone-400 group-hover/btn:text-purple-600 group-hover/btn:border-purple-200 transition-all shadow-sm">
                                    <Upload size={20} />
                                </div>
                                <span className="text-[8px] font-bold text-stone-400 uppercase tracking-wider">Upload</span>
                                <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
                            </label>
                        </div>
                    </div>
                )}
            </div>

            {isWebcamOpen && (
                <div className="fixed inset-0 bg-stone-900/80 backdrop-blur-md z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
                    <div className="bg-white rounded-[2.5rem] overflow-hidden w-full max-w-xl shadow-2xl">
                        <div className="px-8 py-6 border-b border-stone-100 flex justify-between items-center bg-stone-50/50">
                            <div>
                                <h3 className="text-xl font-bold text-stone-900 tracking-tight">Capture {label}</h3>
                                <p className="text-[8px] font-bold text-stone-400 uppercase tracking-widest mt-1">Camera Interface Protocol</p>
                            </div>
                            <button
                                onClick={() => { setIsWebcamOpen(false); setCapturedImage(null); }}
                                className="w-10 h-10 rounded-full bg-white border border-stone-200 flex items-center justify-center text-stone-400 hover:text-stone-900 transition shadow-sm"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-8">
                            <div className={`relative w-full ${ratioClasses[aspectRatio]} rounded-[2rem] bg-stone-900 overflow-hidden shadow-inner`}>
                                {!capturedImage ? (
                                    <Webcam
                                        audio={false}
                                        ref={webcamRef}
                                        screenshotFormat="image/jpeg"
                                        videoConstraints={videoConstraints}
                                        className="w-full h-full object-cover"
                                        mirrored={false}
                                        imageSmoothing={true}
                                        forceScreenshotSourceSize={false}
                                        disablePictureInPicture={true}
                                        onUserMedia={() => { }}
                                        onUserMediaError={() => { }}
                                        screenshotQuality={0.92}
                                    />
                                ) : (
                                    <img src={capturedImage} className="w-full h-full object-cover" alt="Snapshot" />
                                )}
                            </div>

                            <div className="mt-8 flex justify-center gap-4">
                                {!capturedImage ? (
                                    <button
                                        type="button"
                                        onClick={handleCapture}
                                        className="flex flex-col items-center gap-2 group"
                                    >
                                        <div className="w-16 h-16 rounded-full bg-purple-600 border-4 border-white shadow-xl flex items-center justify-center text-white group-hover:bg-purple-700 transition-all transform active:scale-90">
                                            <Camera size={28} />
                                        </div>
                                        <span className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">Capture Snapshot</span>
                                    </button>
                                ) : (
                                    <div className="flex gap-6">
                                        <button
                                            type="button"
                                            onClick={handleRetake}
                                            className="flex flex-col items-center gap-2 group"
                                        >
                                            <div className="w-16 h-16 rounded-full bg-stone-100 border-4 border-white shadow-lg flex items-center justify-center text-stone-500 group-hover:bg-stone-200 transition-all transform active:scale-90">
                                                <RefreshCcw size={28} />
                                            </div>
                                            <span className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">Retake</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleSave}
                                            className="flex flex-col items-center gap-2 group"
                                        >
                                            <div className="w-16 h-16 rounded-full bg-purple-600 border-4 border-white shadow-xl flex items-center justify-center text-white group-hover:bg-purple-700 transition-all transform active:scale-90">
                                                <Check size={28} />
                                            </div>
                                            <span className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">Accept Shot</span>
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
