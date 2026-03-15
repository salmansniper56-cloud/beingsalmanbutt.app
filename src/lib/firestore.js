import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  onSnapshot,
  serverTimestamp,
  writeBatch,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';

// ---------- Users ----------
export async function getUser(uid) {
  const ref = doc(db, 'users', uid);
  const snap = await getDoc(ref);
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function setUser(uid, data) {
  const ref = doc(db, 'users', uid);
  await setDoc(ref, { ...data, updatedAt: serverTimestamp() }, { merge: true });
}

export async function createUserIfNeeded(uid, data) {
  const ref = doc(db, 'users', uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }
}

// ---------- Ads ----------
export async function createAd(ad) {
  const ref = collection(db, 'ads');
  const docRef = await addDoc(ref, {
    ...ad,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    status: 'active',
    likeCount: 0,
  });
  return docRef.id;
}

export async function getAd(adId) {
  const ref = doc(db, 'ads', adId);
  const snap = await getDoc(ref);
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function getAds(opts = {}) {
  const { limitCount = 50, lastDoc } = opts;
  let q = query(
    collection(db, 'ads'),
    orderBy('createdAt', 'desc'),
    limit(limitCount)
  );
  if (lastDoc) q = query(q, startAfter(lastDoc));
  const snap = await getDocs(q);
  const ads = snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      ...data,
      createdAt: data.createdAt?.toDate?.()?.toISOString?.() ?? data.createdAt,
      boostedAt: data.boostedAt?.toDate?.()?.toISOString?.() ?? data.boostedAt,
      boostExpiresAt: data.boostExpiresAt?.toDate?.()?.toISOString?.() ?? data.boostExpiresAt,
    };
  });
  return { ads, lastDoc: snap.docs[snap.docs.length - 1] };
}

export async function updateAdBoost(adId, boostExpiresAt) {
  const ref = doc(db, 'ads', adId);
  await updateDoc(ref, {
    boostedAt: serverTimestamp(),
    boostExpiresAt: Timestamp.fromDate(new Date(boostExpiresAt)),
    updatedAt: serverTimestamp(),
  });
}

export async function updateAdImages(adId, images) {
  const ref = doc(db, 'ads', adId);
  await updateDoc(ref, { images, updatedAt: serverTimestamp() });
}

// ---------- Likes ----------
export async function toggleLike(adId, uid) {
  const likeRef = doc(db, 'ads', adId, 'likes', uid);
  const adRef = doc(db, 'ads', adId);
  const [likeSnap, adSnap] = await Promise.all([getDoc(likeRef), getDoc(adRef)]);
  const currentCount = adSnap.data()?.likeCount ?? 0;
  const batch = writeBatch(db);
  if (likeSnap.exists()) {
    batch.delete(likeRef);
    batch.update(adRef, { likeCount: Math.max(0, currentCount - 1) });
  } else {
    batch.set(likeRef, { uid, createdAt: serverTimestamp() });
    batch.update(adRef, { likeCount: currentCount + 1 });
  }
  await batch.commit();
}

export async function isLiked(adId, uid) {
  const ref = doc(db, 'ads', adId, 'likes', uid);
  const snap = await getDoc(ref);
  return snap.exists();
}

// ---------- Follow ----------
export async function toggleFollow(uid, followerUid) {
  const ref = doc(db, 'users', uid, 'followers', followerUid);
  const userRef = doc(db, 'users', uid);
  const snap = await getDoc(ref);
  const userSnap = await getDoc(userRef);
  const currentCount = userSnap.data()?.followerCount ?? 0;
  const batch = writeBatch(db);
  if (snap.exists()) {
    batch.delete(ref);
    batch.update(userRef, { followerCount: Math.max(0, currentCount - 1) });
  } else {
    batch.set(ref, { createdAt: serverTimestamp() });
    batch.update(userRef, { followerCount: currentCount + 1 });
  }
  await batch.commit();
}

export async function isFollowing(uid, followerUid) {
  const ref = doc(db, 'users', uid, 'followers', followerUid);
  const snap = await getDoc(ref);
  return snap.exists();
}

// ---------- Chats ----------
function chatId(uid1, uid2) {
  return [uid1, uid2].sort().join('_');
}

export function getChatId(uid1, uid2) {
  return chatId(uid1, uid2);
}

export async function getOrCreateChat(uid1, uid2) {
  const id = chatId(uid1, uid2);
  const ref = doc(db, 'chats', id);
  const snap = await getDoc(ref);
  if (snap.exists()) return id;
  await setDoc(ref, {
    participants: [uid1, uid2],
    lastMessage: null,
    lastMessageAt: serverTimestamp(),
    createdAt: serverTimestamp(),
  });
  return id;
}

export async function sendMessage(chatId, senderId, text) {
  const messagesRef = collection(db, 'chats', chatId, 'messages');
  const chatRef = doc(db, 'chats', chatId);
  await addDoc(messagesRef, { senderId, text, createdAt: serverTimestamp() });
  await updateDoc(chatRef, { lastMessage: text, lastMessageAt: serverTimestamp() });
}

export function subscribeMessages(chatId, callback) {
  const q = query(
    collection(db, 'chats', chatId, 'messages'),
    orderBy('createdAt', 'asc')
  );
  return onSnapshot(q, (snap) => {
    const messages = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    callback(messages);
  });
}

export async function getChatsForUser(uid) {
  const q = query(
    collection(db, 'chats'),
    where('participants', 'array-contains', uid),
    limit(50)
  );
  const snap = await getDocs(q);
  const chats = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  chats.sort((a, b) => (b.lastMessageAt?.toMillis?.() ?? 0) - (a.lastMessageAt?.toMillis?.() ?? 0));
  return chats;
}

export async function getChat(chatId) {
  const ref = doc(db, 'chats', chatId);
  const snap = await getDoc(ref);
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

// ---------- User ads ----------
export async function getAdsByUser(uid) {
  const q = query(
    collection(db, 'ads'),
    where('createdBy', '==', uid),
    limit(50)
  );
  const snap = await getDocs(q);
  const ads = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  ads.sort((a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0));
  return ads;
}

// ---------- Posts ----------
export async function createPost(data) {
  const ref = collection(db, 'posts');
  const docRef = await addDoc(ref, {
    ...data,
    likeCount: 0,
    commentCount: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function updatePostMedia(postId, mediaUrls) {
  const ref = doc(db, 'posts', postId);
  await updateDoc(ref, { mediaUrls, updatedAt: serverTimestamp() });
}

export async function getPosts(opts = {}) {
  const { limitCount = 50, lastDoc } = opts;
  let q = query(
    collection(db, 'posts'),
    orderBy('createdAt', 'desc'),
    limit(limitCount)
  );
  if (lastDoc) q = query(q, startAfter(lastDoc));
  const snap = await getDocs(q);
  const posts = snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      ...data,
      createdAt: data.createdAt?.toDate?.()?.toISOString?.() ?? data.createdAt,
    };
  });
  return { posts, lastDoc: snap.docs[snap.docs.length - 1] };
}

export async function deletePost(postId) {
  const ref = doc(db, 'posts', postId);
  await deleteDoc(ref);
}

export async function togglePostLike(postId, uid) {
  const likeRef = doc(db, 'posts', postId, 'likes', uid);
  const postRef = doc(db, 'posts', postId);
  const [likeSnap, postSnap] = await Promise.all([getDoc(likeRef), getDoc(postRef)]);
  const currentCount = postSnap.data()?.likeCount ?? 0;
  const batch = writeBatch(db);
  if (likeSnap.exists()) {
    batch.delete(likeRef);
    batch.update(postRef, { likeCount: Math.max(0, currentCount - 1) });
  } else {
    batch.set(likeRef, { createdAt: serverTimestamp() });
    batch.update(postRef, { likeCount: currentCount + 1 });
  }
  await batch.commit();
}

export async function isPostLiked(postId, uid) {
  const ref = doc(db, 'posts', postId, 'likes', uid);
  const snap = await getDoc(ref);
  return snap.exists();
}

export async function getComments(postId) {
  const q = query(
    collection(db, 'posts', postId, 'comments'),
    orderBy('createdAt', 'asc'),
    limit(100)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      ...data,
      createdAt: data.createdAt?.toDate?.()?.toISOString?.() ?? data.createdAt,
    };
  });
}

export async function addComment(postId, { userId, userName, userPhotoURL, text }) {
  const commentsRef = collection(db, 'posts', postId, 'comments');
  const postRef = doc(db, 'posts', postId);
  const postSnap = await getDoc(postRef);
  const currentCount = postSnap.data()?.commentCount ?? 0;
  await addDoc(commentsRef, {
    userId,
    userName: userName || 'User',
    userPhotoURL: userPhotoURL || '',
    text,
    createdAt: serverTimestamp(),
  });
  await updateDoc(postRef, { commentCount: currentCount + 1, updatedAt: serverTimestamp() });
}

// ---------- Search ----------
export async function searchAds(queryText) {
  if (!queryText?.trim()) return [];
  const q = query(
    collection(db, 'ads'),
    orderBy('title'),
    limit(20)
  );
  const snap = await getDocs(q);
  const lower = queryText.toLowerCase();
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((ad) =>
      ad.title?.toLowerCase().includes(lower) ||
      ad.description?.toLowerCase().includes(lower) ||
      ad.category?.toLowerCase().includes(lower)
    )
    .slice(0, 5);
}

export async function searchUsers(queryText) {
  if (!queryText?.trim()) return [];
  const q = query(
    collection(db, 'users'),
    orderBy('displayName'),
    limit(20)
  );
  const snap = await getDocs(q);
  const lower = queryText.toLowerCase();
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((u) =>
      u.displayName?.toLowerCase().includes(lower) ||
      u.email?.toLowerCase().includes(lower)
    )
    .slice(0, 3);
}
