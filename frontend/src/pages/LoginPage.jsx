import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { googleLogin } from '../services/api';
import {
    Button,
    TextField,
    Container,
    Typography,
    Box,
    Paper,
    Alert,
    Link as MuiLink,
    CircularProgress,
    Grid, // Import Grid
} from '@mui/material';
import GoogleIcon from '@mui/icons-material/Google';

const LoginPage = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [info, setInfo] = useState(''); // For messages like 'access_denied'
    const { login, user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams] = useSearchParams();

    // Get intended destination after login, default to '/admin' for this app
    const from = location.state?.from?.pathname || searchParams.get('redirect') || '/admin';
    // Get params passed by backend redirect (e.g., from Google callback)
    const loginStatus = searchParams.get('login_status');
    const reason = searchParams.get('reason');
    const requiredScope = searchParams.get('required_scope');

    // If user is already logged in, redirect them away from login page
    useEffect(() => {
        if (user) {
            console.log("User already logged in, redirecting from Login page to:", from);
            navigate(from, { replace: true });
        }
    }, [user, navigate, from]);

    useEffect(() => {
        // Display messages based on query params from redirects
        if (loginStatus === 'access_denied' && reason === 'scope_missing') {
            setError(`Access Denied. You need the '${requiredScope}' permission. Please contact the administrator.`);
            // Optionally clear the query params after displaying the message
            // navigate(location.pathname, { replace: true });
        } else if (searchParams.get('logged_out')) {
            setInfo('You have been successfully logged out.');
            // navigate(location.pathname, { replace: true });
        }
        // Clear message if user starts typing
        return () => { setError(''); setInfo(''); };
    }, [searchParams, location.pathname, loginStatus, reason, requiredScope]);

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError('');
        setInfo('');
        setLoading(true);
        const success = await login(email, password);
        setLoading(false);
        if (success) {
            console.log("Login successful, navigating to:", from);
            navigate(from, { replace: true });
        } else {
            setError('Login failed. Please check your email and password.');
        }
    };

    const handleGoogleLogin = () => {
        setError('');
        setInfo('');
        setLoading(true); // Show loading state during redirect
        // Where should Google redirect back to *after* backend processing?
        // Usually back to the root or a specific landing page of *this* auth frontend app,
        // as the backend handles the final redirect to the client app if needed.
        // Let's redirect back to the root of this app to catch the token in the hash.
        const frontendCallbackUrl = window.location.origin + '/';

        // Get client app redirect_uri and scope from query params if they exist
        // These are passed TO the backend /login/google endpoint
        const clientRedirectUri = searchParams.get('redirect_uri');
        const clientScope = searchParams.get('client_scope');

        googleLogin(clientRedirectUri || frontendCallbackUrl, clientScope);
        // Redirect happens in googleLogin, no further navigation needed here
    };

    return (
        <Container component="main" maxWidth="sm"> {/* Keep maxWidth for larger screens */}
            <Grid container justifyContent="center" alignItems="center" sx={{ minHeight: '100vh' }}> {/* Center content vertically */}
                <Grid item xs={12} sm={8} md={6}> {/* Responsive grid for the form */}
                    <Paper elevation={3} sx={{ padding: { xs: 2, sm: 4 }, display: 'flex', flexDirection: 'column', alignItems: 'center' }}> {/* Adjust padding */}
                        <Typography component="h1" variant="h5">
                            Sign In
                        </Typography>
                        {error && <Alert severity="error" sx={{ width: '100%', mt: 2 }}>{error}</Alert>}
                        {info && <Alert severity="info" sx={{ width: '100%', mt: 2 }}>{info}</Alert>}
                        <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1, width: '100%' }}>
                            <TextField
                                margin="normal"
                                required
                                fullWidth
                                id="email"
                                label="Email Address"
                                name="email"
                                autoComplete="email"
                                autoFocus
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                disabled={loading}
                            />
                            <TextField
                                margin="normal"
                                required
                                fullWidth
                                name="password"
                                label="Password"
                                type="password"
                                id="password"
                                autoComplete="current-password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                disabled={loading}
                            />
                            {/* Add Remember me, Forgot password if needed */}
                            <Button
                                type="submit"
                                fullWidth
                                variant="contained"
                                sx={{ mt: 3, mb: 2 }}
                                disabled={loading}
                            >
                                {loading && !error ? <CircularProgress size={24} color="inherit" /> : 'Sign In'}
                            </Button>
                            <Button
                                fullWidth
                                variant="outlined"
                                startIcon={<GoogleIcon />}
                                onClick={handleGoogleLogin}
                                disabled={loading}
                                sx={{ mb: 2 }}
                            >
                                Sign In with Google
                            </Button>
                            {/* Link to registration page if you implement one */}
                            {/* <MuiLink href="/register" variant="body2">
                                {"Don't have an account? Sign Up"}
                            </MuiLink> */}
                        </Box>
                    </Paper>
                </Grid>
            </Grid>
        </Container>
    );
};

export default LoginPage;
