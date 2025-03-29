import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext'; // Import AuthProvider
import ProtectedRoute from './components/ProtectedRoute';
import { CssBaseline, ThemeProvider, createTheme, CircularProgress, Box } from '@mui/material'; // Import MUI base components

// Lazy load pages for better performance
const LoginPage = lazy(() => import('./pages/LoginPage'));
const AdminPage = lazy(() => import('./pages/AdminPage'));
const ForbiddenPage = lazy(() => import('./pages/ForbiddenPage'));
// Add other pages/layouts as needed

// Basic Theme (Customize as needed)
const theme = createTheme({
  palette: {
    // mode: 'dark', // Uncomment for dark mode
    primary: {
      main: '#1976d2', // Example primary color
    },
    secondary: {
      main: '#dc004e', // Example secondary color
    },
  },
  typography: {
     fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif', // Default MUI font stack
  },
  components: {
    // Example: Default props for Button
    MuiButton: {
      defaultProps: {
        disableElevation: true, // Flat buttons by default
      }
    }
  }
});

// Loading fallback for Suspense
const LoadingFallback = () => (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
    </Box>
);

// Layout component example (optional)
const MainLayout = () => {
    // Could include Navbar, Sidebar etc.
    return (
        <>
            {/* <Navbar /> */}
            <Suspense fallback={<LoadingFallback />}>
                <Outlet /> {/* Renders the matched child route */}
            </Suspense>
            {/* <Footer /> */}
        </>
    );
};


function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline /> {/* Ensures consistent baseline styles */}
      <Router> {/* Router now wraps AuthProvider */}
        <AuthProvider> {/* AuthProvider is now inside Router */}
             <Suspense fallback={<LoadingFallback />}>
                  <Routes>
                      {/* Public Routes */}
                      <Route path="/login" element={<LoginPage />} />
                      <Route path="/forbidden" element={<ForbiddenPage />} />

                       {/* Routes requiring authentication */}
                       <Route element={<MainLayout />}> {/* Wrap protected routes in a layout if desired */}

                            {/* Admin Route - Requires 'admin' scope */}
                            <Route
                                path="/admin"
                                element={
                                    <ProtectedRoute requiredScope="admin">
                                        <AdminPage />
                                    </ProtectedRoute>
                                }
                            />

                             {/* Example of another protected route (e.g., user profile) */}
                             {/* <Route
                                path="/profile"
                                element={
                                    <ProtectedRoute> // No specific scope required, just login
                                        <UserProfilePage />
                                    </ProtectedRoute>
                                }
                            /> */}

                            {/* Root route - Redirect based on login status */}
                             <Route path="/" element={<RootRedirect />} />


                             {/* Add other protected routes here */}

                       </Route>


                      {/* Fallback for unknown routes */}
                      <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
             </Suspense>
        </AuthProvider>
      </Router>
    </ThemeProvider>
  );
}

// Helper component to handle redirection from root based on auth state
function RootRedirect() {
    const { user, isLoading } = useAuth();

    if (isLoading) {
        return <LoadingFallback />;
    }

    // If logged in, redirect to admin page (or dashboard), otherwise to login
    return user ? <Navigate to="/admin" replace /> : <Navigate to="/login" replace />;
}


export default App;
