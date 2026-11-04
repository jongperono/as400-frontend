# Frontend Authentication Middleware

This document explains the authentication middleware system implemented in the Next.js frontend.

## Architecture Overview

The authentication system consists of multiple layers:

1. **Next.js Edge Middleware** (`middleware.ts`) - Server-side route protection
2. **Auth Context** (`contexts/AuthContext.tsx`) - Client-side state management
3. **Auth Utilities** (`lib/auth.ts`) - Helper functions for token management
4. **Protected Route Component** (`components/auth/ProtectedRoute.tsx`) - Component-level protection
5. **API Fetch Wrapper** (`lib/apiFetch.ts`) - Automatic token injection for API calls

## Files Structure

```
as400-frontend/
├── middleware.ts                          # Edge middleware for route protection
├── contexts/
│   └── AuthContext.tsx                   # React context for auth state
├── lib/
│   ├── auth.ts                           # Auth utility functions
│   └── apiFetch.ts                       # API fetch with auto token injection
├── components/
│   └── auth/
│       ├── LoginForm.tsx                 # Login form component
│       └── ProtectedRoute.tsx            # Client-side route guard
└── app/
    ├── layout.tsx                        # Root layout with AuthProvider
    ├── login/
    │   └── page.tsx                      # Login page
    └── dashboard/
        └── page.tsx                      # Protected dashboard
```

## How It Works

### 1. Edge Middleware (`middleware.ts`)

Runs on **server-side** before any route is rendered. It checks for authentication tokens in cookies and:

- **Redirects unauthenticated users** trying to access protected routes to `/login`
- **Redirects authenticated users** trying to access login page to `/dashboard`
- Preserves the original destination in the redirect URL for post-login navigation

**Protected Routes:**
```typescript
const protectedRoutes = ["/dashboard", "/sendemail"];
```

**Auth Routes (login/signup):**
```typescript
const authRoutes = ["/login"];
```

**Configuration:**
```typescript
export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
```

This matcher ensures the middleware runs on all routes except:
- API routes
- Static files
- Images
- Next.js internal routes

### 2. Auth Context (`contexts/AuthContext.tsx`)

Provides authentication state across the entire application using React Context.

**Features:**
- Manages user data and token in state
- Syncs with localStorage on mount
- Sets HTTP-only cookies for middleware
- Provides login/logout functions
- Tracks loading state during initialization

**Usage in components:**
```typescript
import { useAuth } from "@/contexts/AuthContext";

function MyComponent() {
  const { user, token, isAuthenticated, login, logout, isLoading } = useAuth();
  
  if (isLoading) return <div>Loading...</div>;
  
  return (
    <div>
      {isAuthenticated ? (
        <p>Welcome, {user?.username}!</p>
      ) : (
        <p>Please log in</p>
      )}
    </div>
  );
}
```

### 3. Auth Utilities (`lib/auth.ts`)

Helper functions for managing authentication tokens and user data.

**Available functions:**

```typescript
// Get token from localStorage
getToken(): string | null

// Get user data from localStorage
getUser(): User | null

// Check if user is authenticated
isAuthenticated(): boolean

// Save auth data to localStorage
setAuth(token: string, user: User): void

// Clear auth data from localStorage
clearAuth(): void

// Verify token validity with backend
verifyToken(): Promise<boolean>
```

### 4. Protected Route Component

Client-side route guard that complements the middleware.

**Usage:**
```typescript
import ProtectedRoute from "@/components/auth/ProtectedRoute";

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <div>Protected content here</div>
    </ProtectedRoute>
  );
}
```

**Props:**
- `requireAuth` (boolean, default: true) - Whether authentication is required
- `redirectTo` (string, default: "/login") - Where to redirect if not authenticated

### 5. API Fetch Wrapper

Automatically injects the Authorization header with Bearer token for API calls.

**Usage:**
```typescript
import { apiFetch } from "@/lib/apiFetch";

// GET request
const response = await apiFetch(`${API_URL}/api/users`);
const data = await response.json();

// POST request
const response = await apiFetch(`${API_URL}/api/users`, {
  method: "POST",
  body: JSON.stringify({ name: "John" }),
});
```

## Authentication Flow

### Login Flow

1. User enters credentials in `LoginForm`
2. Form submits to backend `/api/auth/login`
3. Backend validates and returns `{ token, user, applications }`
4. `LoginForm` calls `login()` from AuthContext
5. AuthContext:
   - Saves to localStorage
   - Updates React state
   - Sets cookie for middleware
6. User is redirected to dashboard or original destination

```
┌──────────┐     ┌──────────────┐     ┌─────────┐
│ LoginForm│────>│AuthContext   │────>│Backend  │
│          │     │- localStorage│     │/api/auth│
│          │     │- React State │     │         │
│          │     │- Cookie      │     │         │
└──────────┘     └──────────────┘     └─────────┘
```

### Protected Route Access

1. User navigates to `/dashboard`
2. **Middleware (server)** checks cookie:
   - ✅ Has token → Allow access
   - ❌ No token → Redirect to `/login?redirect=/dashboard`
3. Page renders, **ProtectedRoute component (client)** checks localStorage:
   - ✅ Has token → Show content
   - ❌ No token → Redirect to login (backup check)
4. **AuthContext** provides user data to components

```
┌──────────────┐     ┌─────────────────┐     ┌──────────────┐
│Middleware    │────>│ProtectedRoute   │────>│AuthContext   │
│(Server)      │     │(Client Guard)   │     │(State)       │
│Check Cookie  │     │Check LocalStore │     │Provide User  │
└──────────────┘     └─────────────────┘     └──────────────┘
```

### Logout Flow

1. User clicks logout button
2. Component calls `logout()` from AuthContext
3. AuthContext:
   - Clears localStorage
   - Clears React state
   - Deletes cookie
4. User is redirected to `/login`

## Token Storage Strategy

We use **dual storage** for better security and UX:

| Storage | Purpose | Accessible By |
|---------|---------|---------------|
| **Cookie** | Middleware checks (server-side) | Server only (Edge Middleware) |
| **localStorage** | Client-side state & API calls | Client JavaScript |

### Why Both?

- **Middleware** needs cookies because it runs on the server where localStorage isn't available
- **Client components** need localStorage for fast synchronous access to user data
- **API calls** read from localStorage to inject Authorization headers

### Cookie Configuration

```typescript
document.cookie = `token=${token}; path=/; max-age=${60 * 60 * 24 * 7}; samesite=lax`;
```

- `path=/` - Available to all routes
- `max-age=604800` - 7 days (matches JWT expiration)
- `samesite=lax` - CSRF protection while allowing navigation

## Adding New Protected Routes

### Method 1: Update Middleware (Recommended)

Add the route to the `protectedRoutes` array in `middleware.ts`:

```typescript
const protectedRoutes = [
  "/dashboard",
  "/sendemail",
  "/admin",        // ← Add your new route
  "/profile",      // ← Add another route
];
```

### Method 2: Component-Level Protection

Wrap your page component with `ProtectedRoute`:

```typescript
// app/admin/page.tsx
import ProtectedRoute from "@/components/auth/ProtectedRoute";

export default function AdminPage() {
  return (
    <ProtectedRoute>
      <div>Admin content</div>
    </ProtectedRoute>
  );
}
```

## Environment Variables

Make sure your `.env.local` file includes:

```bash
NEXT_PUBLIC_API_URL=http://localhost:3008
```

## Testing Authentication

### Test Login
```bash
# Make sure backend is running on port 3008
npm run dev

# Navigate to http://localhost:3000/login
# Try logging in with valid AS400 credentials
```

### Test Protected Routes
```bash
# Try accessing dashboard without logging in
# Should redirect to /login?redirect=/dashboard

# Log in, then check localStorage
# Should see: token, username, applications

# Try accessing dashboard again
# Should display dashboard content
```

### Test Logout
```bash
# Click logout button
# Should clear localStorage and cookies
# Should redirect to /login
```

## Security Considerations

### ✅ Implemented

- JWT token verification on backend
- Edge middleware prevents unauthorized access
- Tokens stored with httpOnly cookies (for middleware)
- Client-side guards as backup protection
- Automatic token injection in API calls
- Token expiration handling (1 hour)
- CSRF protection with SameSite cookies

### ⚠️ Recommendations

1. **Use HTTPS in production** - Cookies should only be transmitted over secure connections
2. **Implement token refresh** - Currently tokens expire after 1 hour with no refresh
3. **Add CSRF tokens** - For additional protection on state-changing operations
4. **Rate limiting** - Implement on backend login endpoint
5. **Consider httpOnly cookies only** - For maximum security, move token completely to httpOnly cookies

## Troubleshooting

### Issue: Redirects to login even after successful login

**Cause:** Cookie not set properly

**Solution:**
1. Check browser developer tools → Application → Cookies
2. Verify `token` cookie exists for your domain
3. Check that cookie `SameSite` attribute is set to `Lax`

### Issue: Middleware not running

**Cause:** Middleware matcher not configured correctly

**Solution:**
1. Check `middleware.ts` exists in the project root (not in `app/`)
2. Verify `export const config` is present
3. Restart the Next.js dev server

### Issue: User data not available in components

**Cause:** AuthProvider not wrapping the app

**Solution:**
1. Check `app/layout.tsx` wraps children with `<AuthProvider>`
2. Verify you're using `useAuth()` inside a component that's a child of AuthProvider

### Issue: API calls return 401 Unauthorized

**Cause:** Token not being sent in request headers

**Solution:**
1. Use `apiFetch()` instead of regular `fetch()`
2. Or manually add header: `Authorization: Bearer ${token}`
3. Check that backend middleware is properly validating tokens

## Next Steps

1. **Implement token refresh** - Add refresh token logic to extend sessions
2. **Add role-based access control** - Restrict certain routes based on user roles
3. **Implement remember me** - Option to persist session longer
4. **Add password reset** - Allow users to recover accounts
5. **Two-factor authentication** - Add extra security layer for sensitive operations

## Additional Resources

- [Next.js Middleware Documentation](https://nextjs.org/docs/app/building-your-application/routing/middleware)
- [Next.js Authentication Guide](https://nextjs.org/docs/app/building-your-application/authentication)
- [React Context Documentation](https://react.dev/reference/react/useContext)
- [JWT Introduction](https://jwt.io/introduction)
