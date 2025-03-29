import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { fetchUsers, createUser, updateUser, deleteUser } from '../services/api';
import { Box, Typography, Button, CircularProgress, Alert, Paper } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
// Import a Table component (you'd create this) or use DataGrid
// import UserTable from '../components/UserTable'; // Example
import UserManagementGrid from '../components/UserManagementGrid'; // Using Data Grid
import UserFormModal from '../components/UserFormModal'; // Modal for Add/Edit

const AdminPage = () => {
    // Ensure only admins can access this page using the ProtectedRoute wrapper in App.jsx
    const { logout } = useAuth(); // Get logout function
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentUserToEdit, setCurrentUserToEdit] = useState(null); // null for Add mode

    const loadUsers = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const response = await fetchUsers();
            setUsers(response.data || []);
        } catch (err) {
            console.error("Failed to fetch users:", err);
            setError('Failed to load users. Please try again later.');
             // Handle specific errors like 403 Forbidden if needed
             if (err.response && err.response.status === 403) {
                 setError('Access Denied. You do not have permission to view users.');
             }
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadUsers();
    }, [loadUsers]);

    const handleOpenAddModal = () => {
        setCurrentUserToEdit(null); // Ensure it's in Add mode
        setIsModalOpen(true);
    };

    const handleOpenEditModal = (user) => {
        setCurrentUserToEdit(user);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setCurrentUserToEdit(null); // Reset edit state
    };

    const handleSaveUser = async (userData, isNew) => {
         setError('');
        try {
            if (isNew) {
                await createUser(userData);
            } else {
                // Don't send password if it hasn't been changed in the form
                const updateData = { ...userData };
                if (!updateData.password) {
                    delete updateData.password;
                }
                await updateUser(currentUserToEdit.id, updateData);
            }
            handleCloseModal();
            await loadUsers(); // Refresh the user list
            return true; // Indicate success
        } catch (err) {
            console.error("Failed to save user:", err);
            setError(err.response?.data?.detail || 'Failed to save user.');
            return false; // Indicate failure
        }
    };

     const handleDeleteUser = async (userId) => {
         setError('');
         // Add confirmation dialog here before proceeding
         if (!window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
             return;
         }
         try {
             await deleteUser(userId);
             await loadUsers(); // Refresh list
         } catch (err) {
              console.error("Failed to delete user:", err);
             setError(err.response?.data?.detail || 'Failed to delete user.');
         }
     };


    return (
        <Box sx={{ padding: 3 }}>
            <Paper sx={{ padding: 2, marginBottom: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h4" component="h1">Admin - User Management</Typography>
                    <Box>
                         <Button
                            variant="contained"
                            startIcon={<AddIcon />}
                            onClick={handleOpenAddModal}
                            sx={{ mr: 2 }}
                        >
                            Add User
                        </Button>
                        <Button variant="outlined" onClick={logout}>Logout</Button>
                    </Box>
                </Box>
                {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            </Paper>

            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 5 }}><CircularProgress /></Box>
            ) : (
                <UserManagementGrid
                    users={users}
                    onEdit={handleOpenEditModal}
                    onDelete={handleDeleteUser}
                />
                // Or your custom UserTable component:
                // <UserTable users={users} onEdit={handleOpenEditModal} onDelete={handleDeleteUser} />
            )}

            <UserFormModal
                open={isModalOpen}
                onClose={handleCloseModal}
                onSave={handleSaveUser}
                user={currentUserToEdit} // Pass user data for editing, null for adding
            />
        </Box>
    );
};

export default AdminPage;