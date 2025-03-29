import React, { useMemo } from 'react';
import { DataGrid } from '@mui/x-data-grid';
import { Box, IconButton, Chip, Tooltip, useMediaQuery, useTheme, Typography } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import GoogleIcon from '@mui/icons-material/Google'; // For Google user indicator
import VisibilityIcon from '@mui/icons-material/Visibility'; // For view details

const UserManagementGrid = ({ users = [], onEdit, onDelete }) => {
    const theme = useTheme();
    const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'));

    const columns = useMemo(() => {
        const baseColumns = [
            {
                field: 'email',
                headerName: 'Email',
                width: isSmallScreen ? 200 : 250,
                renderCell: (params) => {
                    const email = params.value;
                    const displayedEmail = isSmallScreen && email.length > 25 ? `${email.substring(0, 20)}...` : email;
                    return (
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            {params.row.is_google_user && (
                                <Tooltip title="Google User">
                                    <GoogleIcon fontSize="small" sx={{ color: 'text.secondary', mr: 1 }} />
                                </Tooltip>
                            )}
                            <Typography title={email}>{displayedEmail}</Typography>
                        </Box>
                    );
                },
            },
            {
                field: 'actions',
                headerName: 'Actions',
                width: isSmallScreen ? 150 : 120,
                sortable: false,
                disableColumnMenu: true,
                renderCell: (params) => (
                    <Box sx={{ display: 'flex', gap: 1 }}>
                        <Tooltip title="Edit User">
                            <IconButton onClick={() => onEdit(params.row)} size="small">
                                <EditIcon />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete User">
                            <IconButton onClick={() => onDelete(params.row.id)} size="small" color="error">
                                <DeleteIcon />
                            </IconButton>
                        </Tooltip>
                    </Box>
                ),
            },
        ];

        const extraColumns = [
            { field: 'name', headerName: 'Name', width: 150 },
            { field: 'id', headerName: 'ID', width: 90 },
            {
                field: 'scopes',
                headerName: 'Scopes',
                width: 300,
                sortable: false,
                renderCell: (params) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {Array.isArray(params.value) && params.value.map((scope) => (
                            <Chip key={scope} label={scope} size="small" color={scope === 'admin' ? 'secondary' : 'primary'} />
                        ))}
                    </Box>
                ),
            },
            {
                field: 'is_google_user',
                headerName: 'Google',
                width: 80,
                renderCell: (params) => (
                    params.value ? <GoogleIcon color="primary" /> : ''
                ),
            },
            {
                field: 'is_active',
                headerName: 'Active',
                width: 100,
                renderCell: (params) => (
                    params.value ? <CheckCircleIcon color="success" /> : <CancelIcon color="error" />
                ),
            },
            {
                field: 'created_at',
                headerName: 'Created',
                width: 180,
                valueGetter: (value) => value ? new Date(value).toLocaleString() : '',
            },
            {
                field: 'updated_at',
                headerName: 'Updated',
                width: 180,
                valueGetter: (value) => value ? new Date(value).toLocaleString() : '',
            },
        ];

        return isSmallScreen ? baseColumns : [...baseColumns, ...extraColumns];
    }, [isSmallScreen, onEdit, onDelete]);

    const columnVisibilityModel = useMemo(() => {
        if (isSmallScreen) {
            return {
                id: false,
                scopes: false,
                is_google_user: false,
                is_active: false,
                created_at: false,
                updated_at: false,
            };
        }
        return {};
    }, [isSmallScreen]);

    // Ensure users have an id property for DataGrid
    const rows = users.map(user => ({ ...user, id: user.id }));

    return (
        <Box sx={{ height: 600, width: '100%' }}>
            <DataGrid
                rows={rows}
                columns={columns}
                pageSizeOptions={[5, 10, 25]} // Adjust page size options
                initialState={{
                    pagination: { paginationModel: { pageSize: isSmallScreen ? 5 : 10 } }, // Smaller page size on small screens
                    // Default sorting (optional)
                    sorting: {
                        sortModel: [{ field: 'id', sort: 'asc' }],
                    },
                }}
                columnVisibilityModel={columnVisibilityModel}
                checkboxSelection={false} // Disable row selection checkboxes if not needed
                disableRowSelectionOnClick
                autoHeight // Enable auto height for responsiveness
            />
        </Box>
    );
};

export default UserManagementGrid;
