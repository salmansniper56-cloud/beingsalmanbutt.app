import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from './firebase';

export async function uploadFile(path, file) {
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
}

export async function uploadAdImages(adId, files, onProgress) {
  const urls = [];
  for (let i = 0; i < files.length; i++) {
    onProgress?.(i + 1, files.length);
    const url = await uploadFile(`ads/${adId}/${files[i].name}_${i}`, files[i]);
    urls.push(url);
  }
  return urls;
}

export async function uploadProfilePhoto(uid, file) {
  return uploadFile(`users/${uid}/avatar`, file);
}

export async function uploadPostMedia(postId, files, onProgress) {
  const urls = [];
  for (let i = 0; i < files.length; i++) {
    onProgress?.(i + 1, files.length);
    const file = files[i];
    const ext = file.name.split('.').pop() || (file.type.startsWith('video/') ? 'mp4' : 'jpg');
    const path = `posts/${postId}/${i}.${ext}`;
    const url = await uploadFile(path, file);
    urls.push(url);
  }
  return urls;
}
