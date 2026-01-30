import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, Home, ArrowLeft } from 'lucide-react';

export const NotFound: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
            <div className="bg-white p-8 rounded-[2rem] shadow-xl border border-stone-100 max-w-md w-full text-center">
                <div className="flex justify-center mb-6">
                    <div className="p-4 bg-purple-100 rounded-full">
                        <AlertCircle className="w-12 h-12 text-purple-600" />
                    </div>
                </div>

                <h1 className="text-4xl font-bold text-stone-900 mb-2">404</h1>
                <h2 className="text-xl font-bold text-stone-700 mb-4">Page Not Found</h2>

                <p className="text-stone-500 mb-8">
                    The page you are looking for doesn't exist or has been moved.
                    Please check the URL or return to the dashboard.
                </p>

                <div className="flex flex-col gap-3">
                    <button
                        onClick={() => navigate(-1)}
                        className="flex items-center justify-center gap-2 px-6 py-3 bg-stone-100 text-stone-700 rounded-xl font-bold hover:bg-stone-200 transition"
                    >
                        <ArrowLeft size={18} />
                        Go Back
                    </button>

                    <button
                        onClick={() => navigate('/')}
                        className="flex items-center justify-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 transition shadow-lg shadow-purple-200"
                    >
                        <Home size={18} />
                        Back to Dashboard
                    </button>
                </div>
            </div>
        </div>
    );
};
