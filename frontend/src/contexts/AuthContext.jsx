import React, { createContext, useState, useContext, useEffect, useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { loginUser, fetchCurrentUser, loadFrontendData, saveFrontendData } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(() => localStorage.getItem('accessToken'));
    const [isLoading, setIsLoading] = useState(true);
    const [frontendSettings, setFrontendSettings] = useState({}); // For /cookies data
    const navigate = useNavigate();
    const location = useLocation();

    const processToken = useCallback(async (newToken) => {
        localStorage.setItem('accessToken', newToken);
        setToken(newToken);
        try {
            const { data: currentUser } = await fetchCurrentUser();
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            setUser(currentUser);
             // Load frontend settings after successful login
            const { data: cookiesData } = await loadFrontendData();
            setFrontendSettings(cookiesData.data || {});
            return currentUser; // Return user data for potential chaining
        } catch (error) {
            console.error("Failed to fetch current user:", error);
            logout(); // Logout if fetching user fails
            throw error; // Re-throw error for login page handling
        }
    }, []); // No dependencies needed as fetchCurrentUser uses interceptor

    const login = useCallback(async (email, password) => {
        try {
            setIsLoading(true);
            const response = await loginUser(email, password);
            await processToken(response.data.access_token);
            return true; // Indicate success
        } catch (error) {
            console.error("Login failed:", error);
             setUser(null);
             setToken(null);
             localStorage.removeItem('accessToken');
             localStorage.removeItem('currentUser');
             setIsLoading(false);
             return false; // Indicate failure
        } finally {
            setIsLoading(false);
        }
    }, [processToken]);


    const logout = useCallback(() => {
        setUser(null);
        setToken(null);
        setFrontendSettings({});
        localStorage.removeItem('accessToken');
        localStorage.removeItem('currentUser');
    }, []);

    // Check for token in localStorage or URL hash on initial load or refresh
    useEffect(() => {
        const initializeAuth = async () => {
            console.log("AuthContext: initializing auth...");

            setIsLoading(true);
            let foundToken = localStorage.getItem('accessToken');
            let fromUrl = false;

            // Check URL fragment for token (e.g., after Google Redirect)
            if (window.location.hash.includes('token=')) {
                const params = new URLSearchParams(window.location.hash.substring(1)); // Remove '#'
                foundToken = params.get('token');
                const loginStatus = params.get('login_status');
                // Clean the URL
                 window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
                 fromUrl = true;

                 if (loginStatus === 'access_denied') {
                    // Handle access denied case (e.g., show a message)
                    // For now, just prevent login and clear token
                    console.warn("Login successful but access denied for requested scope.");
                    navigate('/forbidden', { replace: true });
                    // navigate('/access-denied?reason=scope');
                 }
            }

            if (foundToken) {
                try {
                     console.log("Token found, processing...");
                     await processToken(foundToken); // Validates token and fetches user
                } catch (error) {
                    console.error("Token validation failed:", error);
                    // Error handling (like logout) is done within processToken/interceptor
                    if (fromUrl) {
                        // If the token from URL failed, clear the token and redirect to login explicitly
                        logout();
                        navigate('/login', { state: { from: location }, replace: true });
                    }
                }
            } else if (!fromUrl) {
                console.log("No token found.");
                // Attempt to load user from localStorage if no token is found initially
                // This handles cases where the tab was closed and reopened
                 const storedUser = localStorage.getItem('currentUser');
                 if(storedUser) {
                    try {
                        setUser(JSON.parse(storedUser));
                        // Optionally try to load settings even if token seems missing (might be stale)
                        // const { data: cookiesData } = await loadFrontendData(); // Requires valid token! Skip if no token.
                        // setFrontendSettings(cookiesData.data || {});
                    } catch (e) { console.error("Error parsing stored user", e)}
                 }
            }
            setIsLoading(false);
        };
        initializeAuth();
        // eslint-disable-next-line react-hooks/exhaustive-deps 
    }, [processToken]); // Add processToken dependency

    // Persist frontend settings to backend
    const saveSettings = useCallback(async (newSettings) => {
        if (!user) return; // Only save if logged in
        try {
            await saveFrontendData(newSettings);
            setFrontendSettings(newSettings);
        } catch (error) {
            console.error("Failed to save frontend settings:", error);
        }
    }, [user]);


    if (!navigate) {
        throw new Error('useNavigate must be used within a Router');
    }

    const contextValue = useMemo(() => ({
        user, token, isLoading, login, logout, processToken, frontendSettings, saveSettings
    }), [user, token, isLoading, login, logout, processToken, frontendSettings, saveSettings]);

    return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
};

function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
export { useAuth };
