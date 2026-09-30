import type { User } from 'firebase/auth';
import { httpsCallable } from 'firebase/functions';
import { firebaseApp, functions } from '@/lib/firebase';

export async function requireAppAccess(user: User): Promise<User> {
  const appId = firebaseApp.options.appId;
  if (!appId) throw new Error('Firebase Access Manager is not configured.');
  const result = await httpsCallable(functions, 'checkMyAccess')({ appId });
  const data = result.data && typeof result.data === 'object' ? result.data as { allowed?: boolean } : {};
  if (data.allowed !== true) {
    throw new Error('Your account is not approved for Students Academics Manager. Contact the administrator for access.');
  }
  return user;
}
