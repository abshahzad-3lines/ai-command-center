/**
 * @fileoverview Microsoft Azure AD authentication provider using MSAL
 * Provides authentication context for the entire application
 */
'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  PublicClientApplication,
  AccountInfo,
  InteractionRequiredAuthError,
  BrowserAuthError,
} from '@azure/msal-browser';
import { msalConfig, loginRequest } from '@/lib/auth/msal-config';

/**
 * Authentication context type providing auth state and methods
 */
interface AuthContextType {
  /** Whether the user is currently authenticated */
  isAuthenticated: boolean;
  /** Whether authentication state is being determined */
  isLoading: boolean;
  /** Current user account information from Azure AD */
  user: AccountInfo | null;
  /** Current access token for API calls */
  accessToken: string | null;
  /** Supabase profile UUID linked to the Microsoft account */
  profileId: string | null;
  /** Initiates the login flow via redirect */
  login: () => Promise<void>;
  /** Signs out the current user */
  logout: () => Promise<void>;
  /** Gets or refreshes the access token */
  getAccessToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/** Single MSAL instance - only initialized on client */
let msalInstance: PublicClientApplication | null = null;
/** Promise to prevent multiple concurrent initializations */
let msalInitPromise: Promise<void> | null = null;

/**
 * Initializes the MSAL (Microsoft Authentication Library) instance
 * Uses singleton pattern to ensure only one instance exists
 *
 * @returns The initialized MSAL instance or null if on server
 */
async function initializeMsalInstance(): Promise<PublicClientApplication | null> {
  // Only run on client side
  if (typeof window === 'undefined') {
    return null;
  }

  if (msalInstance) return msalInstance;

  if (!msalConfig.auth.clientId) {
    console.error('Microsoft Client ID not configured');
    return null;
  }

  if (!msalInitPromise) {
    msalInitPromise = (async () => {
      console.log('Creating MSAL instance...');
      msalInstance = new PublicClientApplication(msalConfig);
      await msalInstance.initialize();
      console.log('MSAL initialized successfully');
    })();
  }

  await msalInitPromise;
  return msalInstance;
}

/**
 * AuthProvider - Microsoft Azure AD authentication provider
 *
 * This provider handles:
 * - MSAL initialization and configuration
 * - Login/logout flows using redirect method
 * - Token acquisition and refresh
 * - Persistent session detection
 *
 * @param props.children - Child components that need auth context
 *
 * @example
 * ```tsx
 * <AuthProvider>
 *   <App />
 * </AuthProvider>
 * ```
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<AccountInfo | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  // Ensure we only run on client
  useEffect(() => {
    setIsMounted(true);
  }, []);

  /**
   * Ensures a Supabase profile exists for the Microsoft account.
   * Creates one if it doesn't exist. Returns the profile UUID.
   */
  const ensureProfile = useCallback(async (account: AccountInfo): Promise<string | null> => {
    try {
      const response = await fetch('/api/auth/ensure-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          microsoftId: account.localAccountId,
          email: account.username,
          name: account.name,
        }),
      });

      const data = await response.json();
      if (data.success && data.data?.id) {
        setProfileId(data.data.id);
        return data.data.id;
      }
    } catch (error) {
      console.error('Failed to ensure profile:', error);
    }
    return null;
  }, []);

  useEffect(() => {
    // Don't run MSAL initialization until component is mounted (client-side)
    if (!isMounted) return;

    let mounted = true;

    const init = async () => {
      try {
        const instance = await initializeMsalInstance();

        if (!instance || !mounted) {
          setIsLoading(false);
          return;
        }

        // Always call handleRedirectPromise - MSAL handles it correctly
        try {
          console.log('Checking for redirect response...');
          const response = await instance.handleRedirectPromise();
          if (response && mounted) {
            console.log('Redirect login successful:', response.account?.username);
            setUser(response.account);
            setAccessToken(response.accessToken);
            setIsAuthenticated(true);
            // Link Microsoft account to Supabase profile
            if (response.account) {
              ensureProfile(response.account);
            }
            // Clear the hash if present
            if (window.location.hash) {
              window.history.replaceState(null, '', window.location.pathname);
            }
            setIsLoading(false);
            return;
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          if (!errorMessage.includes('no_token_request_cache_error')) {
            console.error('Redirect handling error:', error);
          }
        }

        // Check for existing accounts
        const accounts = instance.getAllAccounts();
        if (accounts.length > 0 && mounted) {
          console.log('Found existing account:', accounts[0].username);
          setUser(accounts[0]);
          setIsAuthenticated(true);
          // Link Microsoft account to Supabase profile
          ensureProfile(accounts[0]);

          // Try to get token silently
          try {
            const tokenResponse = await instance.acquireTokenSilent({
              ...loginRequest,
              account: accounts[0],
            });
            if (mounted) {
              setAccessToken(tokenResponse.accessToken);
            }
          } catch {
            console.log('Silent token failed, will need interactive login');
          }
        }
      } catch (error) {
        console.error('MSAL init error:', error);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    init();

    return () => {
      mounted = false;
    };
  }, [isMounted, ensureProfile]);

  const login = useCallback(async () => {
    const instance = await initializeMsalInstance();

    if (!instance) {
      throw new Error('Authentication not configured. Please add Microsoft Client ID.');
    }

    // Use redirect flow - more reliable than popup
    console.log('Starting redirect login...');
    console.log('Client ID:', msalConfig.auth.clientId);
    console.log('Authority:', msalConfig.auth.authority);
    try {
      await instance.loginRedirect({
        ...loginRequest,
        prompt: 'select_account',
      });
    } catch (err: unknown) {
      // Handle interaction_in_progress error by clearing stale state and reloading
      if (err instanceof BrowserAuthError && err.errorCode === 'interaction_in_progress') {
        console.log('Clearing stale interaction state and reloading...');
        // Clear ALL MSAL cache entries
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
          if (key.startsWith('msal.') || key.includes('login.windows.net') || key.includes('microsoftonline')) {
            localStorage.removeItem(key);
          }
        });
        sessionStorage.clear();
        // Reload page to get fresh MSAL instance
        window.location.reload();
        return;
      }
      console.error('loginRedirect error:', err);
      throw err;
    }
  }, []);

  const logout = useCallback(async () => {
    const instance = await initializeMsalInstance();

    if (!instance) {
      setUser(null);
      setAccessToken(null);
      setIsAuthenticated(false);
      return;
    }

    try {
      const account = instance.getAllAccounts()[0];
      await instance.logoutPopup({
        account,
        postLogoutRedirectUri: window.location.origin,
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      setAccessToken(null);
      setProfileId(null);
      setIsAuthenticated(false);
    }
  }, []);

  const getAccessToken = useCallback(async (): Promise<string | null> => {
    const instance = await initializeMsalInstance();
    if (!instance || !user) return null;

    try {
      const response = await instance.acquireTokenSilent({
        ...loginRequest,
        account: user,
      });
      setAccessToken(response.accessToken);
      return response.accessToken;
    } catch (error) {
      if (error instanceof InteractionRequiredAuthError) {
        try {
          const response = await instance.acquireTokenPopup(loginRequest);
          setAccessToken(response.accessToken);
          return response.accessToken;
        } catch (popupError) {
          console.error('Token popup error:', popupError);
          return null;
        }
      }
      console.error('Token error:', error);
      return null;
    }
  }, [user]);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isLoading,
        user,
        accessToken,
        profileId,
        login,
        logout,
        getAccessToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Hook to access authentication context
 *
 * @returns Authentication state and methods
 * @throws Error if used outside of AuthProvider
 *
 * @example
 * ```tsx
 * const { isAuthenticated, user, login, logout } = useAuth();
 * ```
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
