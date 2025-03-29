import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { CircularProgress, Box } from '@mui/material'; // Example loading indicator

const ProtectedRoute = ({ children, requiredScope = null }) => {
    const { user, token, isLoading } = useAuth();
    const location = useLocation();

    if (isLoading) {
        // Show a loading indicator while checking auth status
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                <CircularProgress />
            </Box>
        );
    }

    if (!token || !user) {
        // User not logged in, redirect to login page
        // Preserve the original intended location
        console.log("ProtectedRoute: Not logged in, redirecting to /login");
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // Check for required scope if specified
    if (requiredScope) {
        if (!user.scopes || !user.scopes.includes(requiredScope)) {
             console.log(`ProtectedRoute: Missing scope '${requiredScope}', redirecting to /forbidden`);
            // User logged in but lacks permission, redirect to a forbidden page
            return <Navigate to="/forbidden" replace />;
        }
    }

    // User is authenticated (and has scope if required)
    return children;
};

export default ProtectedRoute;