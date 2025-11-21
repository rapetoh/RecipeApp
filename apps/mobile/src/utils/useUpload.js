import * as React from 'react';

// Cloudinary upload utility
async function uploadToCloudinary(file, options = {}) {
  const cloudName = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

  if (!cloudName || !uploadPreset) {
    throw new Error('Cloudinary configuration missing. Please set EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME and EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET');
  }

  const formData = new FormData();
  
  if (file.uri) {
    // React Native asset
    formData.append('file', {
      uri: file.uri,
      type: file.mimeType || 'image/jpeg',
      name: file.fileName || 'photo.jpg',
    });
  } else if (file.base64) {
    // Base64 string
    formData.append('file', `data:${file.mimeType || 'image/jpeg'};base64,${file.base64}`);
  } else if (file.url) {
    // URL
    formData.append('file', file.url);
  }

  formData.append('upload_preset', uploadPreset);
  
  if (options.folder) {
    formData.append('folder', options.folder);
  }

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    {
      method: 'POST',
      body: formData,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Upload failed');
  }

  const data = await response.json();
  return {
    url: data.secure_url,
    mimeType: data.format ? `image/${data.format}` : null,
  };
}

function useUpload() {
  const [loading, setLoading] = React.useState(false);

  const upload = React.useCallback(async (input) => {
    try {
      setLoading(true);

      let file;
      if (input.reactNativeAsset) {
        file = input.reactNativeAsset;
      } else if (input.base64) {
        file = { base64: input.base64, mimeType: input.mimeType };
      } else if (input.url) {
        file = { url: input.url };
      } else {
        throw new Error('Invalid upload input');
      }

      const result = await uploadToCloudinary(file, { folder: 'recipe-app' });
      return { url: result.url, mimeType: result.mimeType };
    } catch (uploadError) {
      if (uploadError instanceof Error) {
        return { error: uploadError.message };
      }
      if (typeof uploadError === 'string') {
        return { error: uploadError };
      }
      return { error: 'Upload failed' };
    } finally {
      setLoading(false);
    }
  }, []);

  return [upload, { loading }];
}

export { useUpload };
export default useUpload;

