import React from 'react';
import { Container, Typography, Paper, Button, Box, Grid } from '@mui/material'; // Import Grid
import { useNavigate } from 'react-router-dom';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';

import { useAuth } from '../contexts/AuthContext';
const ForbiddenPage = () => {
    const navigate = useNavigate();
    const { logout } = useAuth();

    return (
        <Container component="main" maxWidth="sm">
            <Grid container justifyContent="center" alignItems="center" sx={{ minHeight: '100vh' }}>
                <Grid item xs={12} sm={8} md={6}>
                    <Paper elevation={3} sx={{ p: { xs: 2, sm: 4 }, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <ReportProblemIcon color="error" sx={{ fontSize: { xs: 40, sm: 60 }, mb: 2 }} /> {/* Adjust icon size */}
                        <Typography component="h1" variant="h4" gutterBottom>
                            Access Denied
                        </Typography>
                        <Typography variant="body1" align="center" sx={{ mb: 3 }}>
                            You do not have the necessary permissions to access this page or resource.
                            Please contact the administrator if you believe this is an error.
                        </Typography>
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                            <Box sx={{ display: 'flex', gap: 1 }}>
                                <Button variant="contained" onClick={() => navigate(-1)}>
                                    Go Back
                                </Button>
                                <Button variant="outlined" onClick={() => navigate('/')}>
                                    Go Home
                                </Button>
                            </Box>
                            <Button color="error" onClick={logout}>
                                Logout
                            </Button>
                        </Box>
                    </Paper>
                </Grid>
            </Grid>
        </Container>
    );
};

export default ForbiddenPage;
