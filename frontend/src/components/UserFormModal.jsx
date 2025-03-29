import React, { useState, useEffect } from 'react';
import { Modal, Box, Typography, TextField, Button, Switch, FormControlLabel, FormGroup, Chip, CircularProgress, Alert } from '@mui/material';

const style = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: 400,
  bgcolor: 'background.paper',
  border: '2px solid #000',
  boxShadow: 24,
  p: 4,
};

// Suggest common scopes or allow free text? Let's allow free text for now.
// const availableScopes = ['admin', 'read:profile', 'manage:items', 'service:x'];

const UserFormModal = ({ open, onClose, onSave, user }) => {
    const [formData, setFormData] = useState({
        email: '',
        name: '',
        password: '', // Only set on create or if changing
        scopes: [],
        is_active: true,
    });
    const [scopeInput, setScopeInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const isEditMode = Boolean(user);

    useEffect(() => {
        if (isEditMode && user) {
            setFormData({
                email: user.email || '',
                name: user.name || '',
                password: '', // Don't prefill password for edit
                scopes: user.scopes || [],
                is_active: user.is_active !== undefined ? user.is_active : true,
            });
        } else {
            // Reset for Add mode
            setFormData({
                email: '',
                name: '',
                password: '',
                scopes: [],
                is_active: true,
            });
        }
        setError(''); // Clear errors when modal opens or user changes
        setScopeInput('');
    }, [user, isEditMode, open]); // Depend on `open` to reset when reopened

    const handleChange = (event) => {
        const { name, value, type, checked } = event.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value,
        }));
    };

     const handleScopeInputChange = (event) => {
        setScopeInput(event.target.value);
    };

    const handleAddScope = (event) => {
         if (event.key === 'Enter' || event.type === 'click') {
             event.preventDefault();
             const newScope = scopeInput.trim();
             if (newScope && !formData.scopes.includes(newScope)) {
                 setFormData(prev => ({ ...prev, scopes: [...prev.scopes, newScope] }));
                 setScopeInput(''); // Clear input
             } else if (!newScope) {
                // Maybe add scope on blur too? Or just Enter/button click.
             } else {
                 // Scope already exists, maybe give feedback?
                 console.log(`Scope "${newScope}" already added.`);
                 setScopeInput(''); // Clear input even if duplicate
             }
         }
    };

    const handleDeleteScope = (scopeToDelete) => {
        setFormData(prev => ({
            ...prev,
            scopes: prev.scopes.filter(scope => scope !== scopeToDelete),
        }));
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setLoading(true);
        setError('');
        // Basic validation
        if (!formData.email) {
            setError('Email is required.');
            setLoading(false);
            return;
        }
         if (!isEditMode && !formData.password) {
             setError('Password is required for new users.');
             setLoading(false);
             return;
         }
          if (formData.password && formData.password.length < 8) {
             setError('Password must be at least 8 characters long.');
             setLoading(false);
             return;
         }

        // Prepare data for API (remove empty password if not changing)
        const dataToSave = { ...formData };
        if (isEditMode && !dataToSave.password) {
            delete dataToSave.password;
        }


        const success = await onSave(dataToSave, !isEditMode);
        setLoading(false);
        if (!success) {
             // Error message is likely set by the parent component calling onSave
             // setError('Failed to save user. Check console for details.');
        } else {
             onClose(); // Close modal on successful save (handled by parent)
        }
    };

    return (
        <Modal
            open={open}
            onClose={onClose}
            aria-labelledby="user-form-modal-title"
            aria-describedby="user-form-modal-description"
        >
            <Box sx={style} component="form" onSubmit={handleSubmit} noValidate>
                <Typography id="user-form-modal-title" variant="h6" component="h2">
                    {isEditMode ? 'Edit User' : 'Add New User'}
                </Typography>

                {error && <Alert severity="error" sx={{ mt: 2, mb: 1 }}>{error}</Alert>}

                <TextField
                    margin="normal"
                    required
                    fullWidth
                    id="email"
                    label="Email Address"
                    name="email"
                    autoComplete="email"
                    value={formData.email}
                    onChange={handleChange}
                    disabled={loading || isEditMode} // Disable email editing for now
                    InputProps={{
                        readOnly: isEditMode, // Make it explicitly read-only in edit mode
                      }}
                />
                <TextField
                    margin="normal"
                    fullWidth
                    id="name"
                    label="Name"
                    name="name"
                    autoComplete="name"
                    value={formData.name}
                    onChange={handleChange}
                    disabled={loading}
                />
                <TextField
                    margin="normal"
                    required={!isEditMode} // Required only when adding user
                    fullWidth
                    name="password"
                    label={isEditMode ? "New Password (optional)" : "Password"}
                    type="password"
                    id="password"
                    autoComplete="new-password"
                    value={formData.password}
                    onChange={handleChange}
                    disabled={loading}
                    helperText={isEditMode ? "Leave blank to keep current password." : "Minimum 8 characters."}
                />

                <Typography sx={{ mt: 2, mb: 1 }}>Scopes:</Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1, p: 1, border: '1px solid grey', borderRadius: 1}}>
                     {formData.scopes.map((scope) => (
                        <Chip
                            key={scope}
                            label={scope}
                            onDelete={() => handleDeleteScope(scope)}
                            size="small"
                            disabled={loading}
                        />
                    ))}
                </Box>
                 <Box sx={{ display: 'flex', alignItems: 'center', gap: 1}}>
                    <TextField
                        label="Add Scope"
                        size="small"
                        value={scopeInput}
                        onChange={handleScopeInputChange}
                        onKeyDown={handleAddScope} // Add scope on Enter key
                        disabled={loading}
                        sx={{flexGrow: 1}}
                    />
                     <Button onClick={handleAddScope} variant='outlined' size='small' disabled={loading || !scopeInput.trim()}>Add</Button>
                 </Box>


                <FormControlLabel
                     control={
                        <Switch
                            checked={formData.is_active}
                            onChange={handleChange}
                            name="is_active"
                            disabled={loading}
                        />
                    }
                    label="User Active"
                    sx={{ mt: 1 }}
                />

                <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                    <Button onClick={onClose} disabled={loading} color="secondary">Cancel</Button>
                    <Button type="submit" variant="contained" disabled={loading}>
                        {loading ? <CircularProgress size={24} /> : (isEditMode ? 'Save Changes' : 'Create User')}
                    </Button>
                </Box>
            </Box>
        </Modal>
    );
};

export default UserFormModal;