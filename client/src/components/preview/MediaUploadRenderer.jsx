import React from 'react';

const MediaUploadRenderer = ({ question }) => {
  const questionType = question.questionType;
  
  let mediaType = 'file';
  let acceptTypes = '*';
  let icon = '📁';
  let label = 'Upload File';
  
  if (questionType === 'Image Upload') {
    mediaType = 'image';
    acceptTypes = 'image/*';
    icon = '📷';
    label = 'Upload Image';
  } else if (questionType === 'Video Upload') {
    mediaType = 'video';
    acceptTypes = 'video/*';
    icon = '🎥';
    label = 'Upload Video';
  } else if (questionType === 'Voice Response') {
    mediaType = 'audio';
    acceptTypes = 'audio/*';
    icon = '🎤';
    label = 'Upload Audio';
  }

  return (
    <div className="media-upload-renderer">
      <div className="upload-placeholder">
        <div className="upload-icon">{icon}</div>
        <div className="upload-label">{label}</div>
        <input
          type="file"
          accept={acceptTypes}
          className="upload-input"
        />
      </div>
    </div>
  );
};

export default MediaUploadRenderer;
