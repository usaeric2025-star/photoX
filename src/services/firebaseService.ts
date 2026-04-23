import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged,
  User 
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  collection, 
  query, 
  getDocs, 
  writeBatch,
  deleteDoc,
  serverTimestamp
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { Photo, Category, Tag } from '../types';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

const googleProvider = new GoogleAuthProvider();

export const loginWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error('Login failed:', error);
    throw error;
  }
};

export const logout = () => auth.signOut();

export const onAuthChange = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, callback);
};

// Firestore Sync Functions
export const syncPhotosToCloud = async (userId: string, photos: Photo[]) => {
  const batch = writeBatch(db);
  photos.forEach(photo => {
    const photoRef = doc(db, 'users', userId, 'photos', photo.id);
    batch.set(photoRef, { ...photo, userId });
  });
  await batch.commit();
};

export const syncCategoriesToCloud = async (userId: string, categories: Category[]) => {
  const batch = writeBatch(db);
  categories.forEach(cat => {
    const catRef = doc(db, 'users', userId, 'categories', cat.id);
    batch.set(catRef, { ...cat, userId });
  });
  await batch.commit();
};

export const syncTagsToCloud = async (userId: string, tags: Tag[]) => {
  const batch = writeBatch(db);
  tags.forEach(tag => {
    const tagRef = doc(db, 'users', userId, 'tags', tag.id);
    batch.set(tagRef, { ...tag, userId });
  });
  await batch.commit();
};

export const loadPhotosFromCloud = async (userId: string): Promise<Photo[]> => {
  const q = query(collection(db, 'users', userId, 'photos'));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => doc.data() as Photo);
};

export const loadCategoriesFromCloud = async (userId: string): Promise<Category[]> => {
  const q = query(collection(db, 'users', userId, 'categories'));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => doc.data() as Category);
};

export const loadTagsFromCloud = async (userId: string): Promise<Tag[]> => {
  const q = query(collection(db, 'users', userId, 'tags'));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => doc.data() as Tag);
};

// Generic save function for single items
export const savePhotoToCloud = async (userId: string, photo: Photo) => {
  const photoRef = doc(db, 'users', userId, 'photos', photo.id);
  await setDoc(photoRef, { ...photo, userId });
};

export const deletePhotoFromCloud = async (userId: string, photoId: string) => {
  const photoRef = doc(db, 'users', userId, 'photos', photoId);
  await deleteDoc(photoRef);
};
