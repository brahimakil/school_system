import React from 'react';
import './MediaPreview.css';

interface MediaPreviewProps {
  mediaUrl: string;
  mediaType: 'image' | 'video';
  fileName?: string;
  onClose: () => void;
}

const MediaPreview: React.FC<MediaPreviewProps> = ({ mediaUrl, mediaType, fileName, onClose }) => {
  return (
    <div className="media-preview-overlay" onClick={onClose}>
      <div className="media-preview-content" onClick={(e) => e.stopPropagation()}>
        <button className="media-preview-close" onClick={onClose}>
          ✕
        </button>
        {mediaType === 'image' ? (
          <img src={mediaUrl} alt={fileName} className="media-preview-image" />
        ) : (
          <video src={mediaUrl} controls autoPlay className="media-preview-video">
            <source src={mediaUrl} />
          </video>
        )}
        {fileName && (
          <div className="media-preview-filename">{fileName}</div>
        )}
      </div>
    </div>
  );
};

export default MediaPreview;
