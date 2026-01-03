/**
 * Firebase設定
 * Phase 52: Firebase Authentication導入
 */

import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Firebase設定（公開可能な情報のみ）
const firebaseConfig = {
  apiKey: "AIzaSyDt3hdvVBczGnsW5qG0YrYHGke0i0PozRo",
  authDomain: "facility-care-input-form.firebaseapp.com",
  projectId: "facility-care-input-form",
  storageBucket: "facility-care-input-form.firebasestorage.app",
  messagingSenderId: "672520607884",
  appId: "1:672520607884:web:ab66d2178e3d1f957743a9"
};

// Firebase初期化
const app = initializeApp(firebaseConfig);

// Firebase Auth
export const auth = getAuth(app);

// Firestore（許可リストチェック用）
export const db = getFirestore(app);

// Google認証プロバイダ（Chat APIスコープ付き）
export function createGoogleProvider(): GoogleAuthProvider {
  const provider = new GoogleAuthProvider();
  // Chat API読み取りスコープを追加
  provider.addScope('https://www.googleapis.com/auth/chat.spaces.readonly');
  provider.addScope('https://www.googleapis.com/auth/chat.messages.readonly');
  // 毎回アカウント選択を表示
  provider.setCustomParameters({
    prompt: 'select_account'
  });
  return provider;
}
