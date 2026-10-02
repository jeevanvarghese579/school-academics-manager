import type { User } from 'firebase/auth';
import { httpsCallable } from 'firebase/functions';
import { firebaseApp, functions } from '@/lib/firebase';
import { offerAccessRequest } from '@/lib/accessRequestDialog';

export async function requireAppAccess(user: User): Promise<User> {
  const appId = firebaseApp.options.appId;
  if (!appId) throw new Error('Firebase Access Manager is not configured.');
  const result = await httpsCallable(functions, 'checkMyAccess')({ appId });
  const data = result.data && typeof result.data === 'object' ? result.data as { allowed?: boolean; requestStatus?: string } : {};
  if (data.allowed !== true) {
    const approved = await offerAccessRequest({
      appName: 'Students Academics Manager',
      requestStatus: data.requestStatus,
      sendRequest: async () => (await httpsCallable(functions, 'requestAppAccess')({ appId, requestType: 'access-request' })).data,
      checkAccess: async () => (await httpsCallable(functions, 'checkMyAccess')({ appId })).data,
    });
    if (approved) return user;
    throw new Error(data.requestStatus === 'pending' ? 'Your access request is awaiting administrator approval.' : 'Your account is not approved for Students Academics Manager.');
  }
  return user;
}
