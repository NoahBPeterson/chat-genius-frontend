import React, { useState } from 'react';
import API_Client from '../API_Client';
import { v4 as uuidv4 } from 'uuid';

interface FileUploadProps {
    onUploadComplete: (storagePath: string, filename: string, size: number, mimeType: string) => void;
}

const FileUpload: React.FC<FileUploadProps> = ({ onUploadComplete }) => {
    const [uploading, setUploading] = useState(false);

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            setUploading(true);

            // Generate unique filename
            const fileExtension = file.name.split('.').pop();
            const uniqueFilename = `${uuidv4()}.${fileExtension}`;

            // 1. Get pre-signed URL
            const urlResponse = await API_Client.post('/api/upload/request-url', {
                filename: uniqueFilename,
                contentType: file.type,
                size: file.size
            });

            // 2. Upload to S3
            await fetch(urlResponse.data.uploadUrl, {
                method: 'PUT',
                body: file,
                headers: {
                    'Content-Type': file.type
                }
            });

            // 3. Notify parent component with file info
            onUploadComplete(urlResponse.data.storagePath, uniqueFilename, file.size, file.type);
        } catch (error) {
            console.error('Upload error:', error);
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="relative">
            <input
                type="file"
                onChange={handleFileSelect}
                disabled={uploading}
                className="hidden"
                id="file-upload"
            />
            <label
                htmlFor="file-upload"
                className={`cursor-pointer p-2 rounded-full hover:bg-purple-600 
                    ${uploading ? 'bg-purple-400' : 'bg-purple-700'} 
                    transition-colors flex items-center justify-center`}
                title="Attach file"
            >
                {uploading ? (
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                    </svg>
                ) : (
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                    </svg>
                )}
            </label>
        </div>
    );
};

export default FileUpload; 