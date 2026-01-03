/**
 * AuthContext - Firebase Authentication コンテキスト
 * Phase 52: ユーザー認証とアクセス制御
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import {
  type User,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  GoogleAuthProvider,
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db, createGoogleProvider } from '../config/firebase';

/** 認証コンテキストの型定義 */
export interface AuthContextType {
  /** 現在のユーザー（未認証時はnull） */
  user: User | null;
  /** 認証状態の読み込み中フラグ */
  isLoading: boolean;
  /** ユーザーが許可リストに含まれているか */
  isAllowed: boolean;
  /** 許可チェック中フラグ */
  isCheckingPermission: boolean;
  /** Google OAuth アクセストークン（Chat API用） */
  accessToken: string | null;
  /** エラーメッセージ */
  error: string | null;
  /** Googleでサインイン */
  signInWithGoogle: () => Promise<void>;
  /** サインアウト */
  signOut: () => Promise<void>;
  /** アクセストークンを再取得（期限切れ対策） */
  refreshAccessToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/** AuthContextを使用するカスタムフック */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
}

/**
 * 許可リストをチェック
 * Firestore allowed_users コレクションを参照
 *
 * 構造:
 * allowed_users/
 *   domains/{domain}: { allowed: true }
 *   emails/{email_key}: { email: "user@example.com", allowed: true }
 *
 * email_key はメールアドレスの "." を "_" に置換した文字列
 */
async function checkAllowedUser(email: string): Promise<boolean> {
  try {
    // ドメインを抽出
    const domain = email.split('@')[1];

    // ドメイン許可をチェック（allowed_users/domains/{domain}）
    const domainDoc = await getDoc(doc(db, 'allowed_users', 'domains', domain));
    if (domainDoc.exists() && domainDoc.data()?.allowed) {
      return true;
    }

    // 個別メール許可をチェック（allowed_users/emails/{email_key}）
    // Firestoreはドキュメント名に "." を含められないため、"_" に置換
    const emailKey = email.replace(/\./g, '_');
    const emailDoc = await getDoc(doc(db, 'allowed_users', 'emails', emailKey));
    if (emailDoc.exists() && emailDoc.data()?.allowed) {
      return true;
    }

    return false;
  } catch (error) {
    console.error('許可チェックエラー:', error);
    // Firestoreアクセスエラー（ルール未設定など）の場合は許可しない
    return false;
  }
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAllowed, setIsAllowed] = useState(false);
  const [isCheckingPermission, setIsCheckingPermission] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 認証状態の監視
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      setIsLoading(false);

      if (firebaseUser?.email) {
        setIsCheckingPermission(true);
        try {
          const allowed = await checkAllowedUser(firebaseUser.email);
          setIsAllowed(allowed);
          if (!allowed) {
            setError('このアカウントはアクセスを許可されていません');
          } else {
            setError(null);
          }
        } catch (err) {
          console.error('許可チェックエラー:', err);
          setIsAllowed(false);
          setError('アクセス権限の確認に失敗しました');
        } finally {
          setIsCheckingPermission(false);
        }
      } else {
        setIsAllowed(false);
        setAccessToken(null);
      }
    });

    return () => unsubscribe();
  }, []);

  // Googleでサインイン
  const signInWithGoogle = useCallback(async () => {
    setError(null);
    try {
      const provider = createGoogleProvider();
      const result = await signInWithPopup(auth, provider);

      // OAuth アクセストークンを取得
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        setAccessToken(credential.accessToken);
      }
    } catch (err) {
      console.error('サインインエラー:', err);
      if (err instanceof Error) {
        if (err.message.includes('popup-closed-by-user')) {
          setError('ログインがキャンセルされました');
        } else if (err.message.includes('network-request-failed')) {
          setError('ネットワークエラーが発生しました');
        } else {
          setError('ログインに失敗しました');
        }
      } else {
        setError('ログインに失敗しました');
      }
    }
  }, []);

  // サインアウト
  const signOut = useCallback(async () => {
    try {
      await firebaseSignOut(auth);
      setAccessToken(null);
      setIsAllowed(false);
      setError(null);
    } catch (err) {
      console.error('サインアウトエラー:', err);
      setError('ログアウトに失敗しました');
    }
  }, []);

  // アクセストークンを再取得（約1時間で失効するため）
  const refreshAccessToken = useCallback(async (): Promise<string | null> => {
    if (!user) return null;

    try {
      const provider = createGoogleProvider();
      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);

      if (credential?.accessToken) {
        setAccessToken(credential.accessToken);
        return credential.accessToken;
      }
      return null;
    } catch (err) {
      console.error('トークン更新エラー:', err);
      return null;
    }
  }, [user]);

  const value: AuthContextType = {
    user,
    isLoading,
    isAllowed,
    isCheckingPermission,
    accessToken,
    error,
    signInWithGoogle,
    signOut,
    refreshAccessToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
