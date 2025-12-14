# Auth Service

This is the central authentication service.

## Configuration

### Security: Allowed Origins

To prevent **Open Redirect** vulnerabilities, you must configure the `ALLOWED_ORIGINS` environment variable.
This variable defines which domains/origins the Auth Service is allowed to redirect users to after login.

**Format:** A JSON list of strings.

**Example (.env):**
```env
ALLOWED_ORIGINS=["http://localhost:5173", "https://myapp.com", "https://admin.myapp.com"]
```

**Behavior:**
Any `redirect_uri` passed to the login endpoint must **start with** one of these allowed origins.
For example, if `http://localhost:5173` is allowed, then:
- `http://localhost:5173/login/callback` is **ALLOWED**.
- `http://localhost:5173/profile` is **ALLOWED**.
- `http://attacker.com` is **BLOCKED**.

### Other Variables
- `FRONTEND_URL`: Default redirect URL.
- `GOOGLE_CLIENT_ID`: For Google OAuth.
- `GOOGLE_CLIENT_SECRET`: For Google OAuth.
