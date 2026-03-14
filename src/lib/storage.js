import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from './firebase';

export async function uploadFile(path, file) {
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
}

export async function uploadAdImages(adId, files) {
  const urls = await Promise.all(
    files.map((file, i) => uploadFile(`ads/${adId}/${file.name}_${i}`, file))
  );
  return urls;
}

export async function uploadProfilePhoto(uid, file) {
  return uploadFile(`users/${uid}/avatar`, file);
}
