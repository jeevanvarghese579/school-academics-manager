import { collection, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export const APP_KEY = 'schoolAcademicsManager' as const;

export const userCollection = (uid: string, name: string) =>
  collection(db, 'apps', APP_KEY, 'users', uid, name);

export const userDocument = (uid: string, name: string, id: string) =>
  doc(db, 'apps', APP_KEY, 'users', uid, name, id);

