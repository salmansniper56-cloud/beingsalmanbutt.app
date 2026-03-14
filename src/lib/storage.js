const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

async function uploadToCloudinary(file, folder) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', UPLOAD_PRESET);
  formData.append('folder', folder);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`,
    {
      method: 'POST',
      body: formData,
    }
  );

  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || 'Upload failed');
  return data.secure_url;
}

export async function uploadFile(path, file) {
  return uploadToCloudinary(file, path);
}

export async function uploadAdImages(adId, files, onProgress) {
  const urls = [];
  for (let i = 0; i < files.length; i++) {
    onProgress?.(i + 1, files.length);
    const url = await uploadToCloudinary(files[i], `ads/${adId}`);
    urls.push(url);
  }
  return urls;
}

export async function uploadProfilePhoto(uid, file) {
  return uploadToCloudinary(file, `users/${uid}`);
}

export async function uploadPostMedia(postId, files, onProgress) {
  const urls = [];
  for (let i = 0; i < files.length; i++) {
    onProgress?.(i + 1, files.length);
    const url = await uploadToCloudinary(files[i], `posts/${postId}`);
    urls.push(url);
  }
  return urls;
}
