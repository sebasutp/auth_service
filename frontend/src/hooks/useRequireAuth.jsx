import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const useRequireAuth = (requiredScope = null) => {
    const { user, token, isLoading } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        if (isLoading) {
            return; // Wait until loading is finished
        }

        if (!token || !user) {
             console.log("Auth required, redirecting to login.");
            // Redirect them to the /login page, but save the current location they were
            // trying to go to when they were redirected. This allows us to send them
            // along to that page after they login, which is a nicer user experience
            // than dropping them off on the home page.
            navigate('/login', { state: { from: location }, replace: true });
            return;
        }

        // Check for required scope if specified
        if (requiredScope) {
            if (!user.scopes || !user.scopes.includes(requiredScope)) {
                console.log(`Scope '${requiredScope}' required, redirecting or showing forbidden.`);
                // Option 1: Redirect to a 'forbidden' page
                navigate('/forbidden', { replace: true });
                // Option 2: Redirect to login (less informative)
                // navigate('/login', { state: { from: location }, replace: true });
            }
        }

    }, [user, token, isLoading, requiredScope, navigate, location]);

    // Optionally return loading state or user if needed by the component using the hook
    return { isLoading, user };
};

export default useRequireAuth;