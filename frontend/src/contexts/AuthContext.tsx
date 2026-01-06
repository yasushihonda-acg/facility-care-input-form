/* eslint-disable react-refresh/only-export-components -- Context + Hook を同一ファイルでエクスポート */
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
 * Firestore コレクションを参照
 *
 * 構造:
 * allowed_domains/{domain}: { allowed: true }
 * allowed_emails/{email_key}: { allowed: true }
 *
 * email_key はメールアドレスの "." を "_" に置換した文字列
 */
async function checkAllowedUser(email: string): Promise<boolean> {
  try {
    // ドメインを抽出
    const domain = email.split('@')[1];

    // ドメイン許可をチェック（allowed_domains/{domain}）
    const domainDoc = await getDoc(doc(db, 'allowed_domains', domain));
    if (domainDoc.exists() && domainDoc.data()?.allowed) {
      return true;
    }

    // 個別メール許可をチェック（allowed_emails/{email_key}）
    // Firestoreはドキュメント名に "." を含められないため、"_" に置換
    const emailKey = email.replace(/\./g, '_');
    const emailDoc = await getDoc(doc(db, 'allowed_emails', emailKey));
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

// アクセストークンのsessionStorageキー
const ACCESS_TOKEN_KEY = 'google_access_token';
const TOKEN_EXPIRY_KEY = 'google_token_expiry';

// トークンをsessionStorageに保存
function saveAccessToken(token: string) {
  sessionStorage.setItem(ACCESS_TOKEN_KEY, token);
  // 23時間後に期限切れ（実際は1時間だが、API失敗時のみ再認証するため長めに設定）
  // 方法C: トークン期限切れはAPI失敗で検知し、その時のみ再認証を要求
  const expiry = Date.now() + 23 * 60 * 60 * 1000;
  sessionStorage.setItem(TOKEN_EXPIRY_KEY, expiry.toString());
}

// トークンをsessionStorageから取得（期限切れチェック付き）
function loadAccessToken(): string | null {
  const token = sessionStorage.getItem(ACCESS_TOKEN_KEY);
  const expiry = sessionStorage.getItem(TOKEN_EXPIRY_KEY);

  if (!token || !expiry) return null;

  // 期限切れチェック
  if (Date.now() > parseInt(expiry, 10)) {
    sessionStorage.removeItem(ACCESS_TOKEN_KEY);
    sessionStorage.removeItem(TOKEN_EXPIRY_KEY);
    return null;
  }

  return token;
}

// トークンをクリア
function clearAccessToken() {
  sessionStorage.removeItem(ACCESS_TOKEN_KEY);
  sessionStorage.removeItem(TOKEN_EXPIRY_KEY);
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAllowed, setIsAllowed] = useState(false);
  const [isCheckingPermission, setIsCheckingPermission] = useState(false);
  // 初期値をsessionStorageから復元
  const [accessToken, setAccessToken] = useState<string | null>(() => loadAccessToken());
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

      // OAuth アクセストークンを取得・保存
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        setAccessToken(credential.accessToken);
        saveAccessToken(credential.accessToken);
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
      clearAccessToken();
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
        saveAccessToken(credential.accessToken);
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
