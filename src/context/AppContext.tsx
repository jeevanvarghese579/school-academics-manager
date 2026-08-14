import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { User } from 'firebase/auth';
import { createUserWithEmailAndPassword, onAuthStateChanged, signInWithEmailAndPassword, signInWithPopup, signOut as firebaseSignOut } from 'firebase/auth';
import { auth, googleProvider } from '@/lib/firebase';
import { IndexedDbRepository } from '@/data/IndexedDbRepository';
import { FirestoreRepository } from '@/data/FirestoreRepository';
import type { DataRepository } from '@/data/DataRepository';
import type { StorageMode } from '@/types';
import { DEFAULT_SETTINGS } from '@/types';
import { v4 as uuidv4 } from 'uuid';

type AppMode = 'unselected' | StorageMode;
interface AppContextValue { mode: AppMode; setMode:(mode:AppMode)=>void; enterOfflineMode:()=>void; exitOfflineMode:()=>void; repo:DataRepository|null; user:User|null; loading:boolean; loginWithGoogle:()=>Promise<void>; loginWithEmail:(email:string,password:string)=>Promise<void>; registerWithEmail:(email:string,password:string)=>Promise<void>; signOut:()=>Promise<void>; }
const AppContext=createContext<AppContextValue|undefined>(undefined); const MODE_KEY='sam-mode';
const friendlyError=(error:any)=>{const code=error?.code||'';if(code.includes('popup-closed'))return 'Google sign-in was cancelled.';if(code.includes('popup-blocked'))return 'Your browser blocked the sign-in popup.';if(code.includes('network'))return 'Network error. Please check your connection.';if(code.includes('email-already-in-use'))return 'An account already exists for this email.';if(code.includes('wrong-password')||code.includes('invalid-credential'))return 'Incorrect email or password.';if(code.includes('invalid-email'))return 'Enter a valid email address.';if(code.includes('weak-password'))return 'Use a password with at least 6 characters.';return 'Authentication failed. Please try again.';};
export function AppProvider({children}:{children:ReactNode}){const [mode,setModeState]=useState<AppMode>(()=>(localStorage.getItem(MODE_KEY) as AppMode|null)??'unselected');const [user,setUser]=useState<User|null>(null);const [loading,setLoading]=useState(true);
 useEffect(()=>onAuthStateChanged(auth,next=>{setUser(next);setLoading(false);if(!next&&localStorage.getItem(MODE_KEY)==='online'){setModeState('unselected');localStorage.removeItem(MODE_KEY);}}),[]);
 const setMode=(next:AppMode)=>{setModeState(next);if(next==='unselected')localStorage.removeItem(MODE_KEY);else localStorage.setItem(MODE_KEY,next);}; const enterOfflineMode=()=>setMode('offline');const exitOfflineMode=()=>setMode('unselected');
 const loginWithGoogle=async()=>{try{await signInWithPopup(auth,googleProvider);setMode('online');}catch(e){throw new Error(friendlyError(e));}};const loginWithEmail=async(email:string,password:string)=>{try{await signInWithEmailAndPassword(auth,email,password);setMode('online');}catch(e){throw new Error(friendlyError(e));}};const registerWithEmail=async(email:string,password:string)=>{try{await createUserWithEmailAndPassword(auth,email,password);setMode('online');}catch(e){throw new Error(friendlyError(e));}};const signOut=async()=>{await firebaseSignOut(auth);setMode('unselected');};
 const repo=useMemo<DataRepository|null>(()=>mode==='offline'?new IndexedDbRepository():mode==='online'&&user?new FirestoreRepository(user.uid):null,[mode,user]);
 useEffect(()=>{if(!repo)return;void repo.getSettings().then(existing=>{if(!existing){const timestamp=new Date().toISOString();return repo.saveSettings({...DEFAULT_SETTINGS,id:uuidv4(),createdAt:timestamp,updatedAt:timestamp});}}).catch(()=>undefined);},[repo]);
 return <AppContext.Provider value={{mode,setMode,enterOfflineMode,exitOfflineMode,repo,user,loading,loginWithGoogle,loginWithEmail,registerWithEmail,signOut}}>{children}</AppContext.Provider>;
}
export function useApp(){const value=useContext(AppContext);if(!value)throw new Error('useApp must be used within AppProvider');return value;}
