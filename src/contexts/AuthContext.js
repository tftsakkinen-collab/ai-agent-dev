import React, { createContext, useContext, useState, useEffect } from 'react';
import { getProfile, getToken, logout as apiLogout, login as apiLogin, verifyLoginCode as apiVerifyCode } from '../lib/api';

const AuthContext = createContext({
  user: null,
  loading: true,
  isLoggedIn: false,
  login: async () => {},
  verifyCode: async () => {},
  logout: async () => {},
  refreshProfile: async () => {}
});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initAuth();
  }, []);

  const initAuth = async () => {
    try {
      setLoading(true);
      const token = await getToken();
      if (!token) {
        setUser(null);
        return;
      }
      const profile = await getProfile();
      setUser(profile);
    } catch (e) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email) => {
    const res = await apiLogin(email);
    await refreshProfile();
    return res;
  };

  const verifyCode = async (email, code) => {
    const res = await apiVerifyCode(email, code);
    await refreshProfile();
    return res;
  };

  const logout = async () => {
    await apiLogout();
    setUser(null);
  };

  const refreshProfile = async () => {
    const profile = await getProfile();
    setUser(profile);
    return profile;
  };

  const value = {
    user,
    loading,
    isLoggedIn: Boolean(user && user.email),
    login,
    verifyCode,
    logout,
    refreshProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
