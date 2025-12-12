# Employee Profile API - Thunder Client Tests

This folder contains Thunder Client test collections for the Employee Profile API with automatic token authentication.

## Setup

1. **Install Thunder Client Extension** in VS Code
   - Open VS Code Extensions (Ctrl+Shift+X)
   - Search for "Thunder Client"
   - Install it

2. **Import the Collection**
   - The collection is automatically detected from this folder
   - Or manually import: Thunder Client → Collections → Menu → Import

3. **Set Environment Variables**
   - Go to Thunder Client → Env tab
   - Select "Local" environment
   - Update these variables after getting them from your responses:
     - `employeeId` - Your employee ID
     - `positionId` - Your position ID (for manager endpoints)
     - `requestId` - A change request ID (for review endpoint)

## How to Test

### Step 1: Login and Get Token
1. Open the **Authentication** folder
2. Run **"Login (Get Token)"** request
3. Update the request body with valid credentials:
   ```json
   {
     "email": "your-email@company.com",
     "password": "your-password"
   }
   ```
4. The `access_token` will be automatically saved to environment variables

### Step 2: Test Self-Service Endpoints
All requests in the **Self-Service** folder use automatic Bearer token authentication:
- **Get Employee Profile** - View your profile
- **Update Self-Service Profile** - Update your personal info
- **Create Change Request** - Request changes to restricted fields
- **Get My Change Requests** - View your change requests

### Step 3: Test Manager Endpoints
Requires `VIEW_TEAM_PROFILES` permission:
- **Get Manager Team Brief** - View direct reports

### Step 4: Test Admin/HR Endpoints
Requires `MANAGE_ALL_PROFILES` permission:
- **Admin - Create Employee** - Create new employee profile
- **Admin - Search Employees** - Search by name/email
- **Admin - Get Pending Change Requests** - View all pending requests
- **Admin - Review Change Request** - Approve/reject change requests
- **Admin - Update Employee Profile** - Update any employee field
- **Admin - Set System Roles** - Assign system roles
- **Admin - Deactivate Employee** - Deactivate employee profile

## Authentication Methods

The API supports **automatic token extraction** from:

1. **Bearer Token (Recommended for Thunder Client)**
   - Set in Auth tab → Bearer Token → `{{access_token}}`
   - Already configured in all requests

2. **Cookie (Automatic)**
   - If your login endpoint sets `access_token` cookie
   - No configuration needed

3. **Authorization Header**
   - Manually add: `Authorization: Bearer YOUR_TOKEN`

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `baseUrl` | API base URL | `http://localhost:3000` |
| `access_token` | JWT token (auto-set after login) | `eyJhbGc...` |
| `employeeId` | Employee ID for testing | `507f1f77bcf86cd799439011` |
| `positionId` | Position ID for manager tests | `507f1f77bcf86cd799439012` |
| `requestId` | Change request ID for review | `507f1f77bcf86cd799439013` |

## Permission Requirements

| Endpoint | Permission Required |
|----------|-------------------|
| Get Profile | `EDIT_OWN_PROFILE` (own) or `MANAGE_ALL_PROFILES` (any) |
| Update Self-Service | `EDIT_OWN_PROFILE` |
| Create Change Request | `EDIT_OWN_PROFILE` |
| Get My Change Requests | `EDIT_OWN_PROFILE` |
| Manager Team Brief | `VIEW_TEAM_PROFILES` |
| Admin Endpoints | `MANAGE_ALL_PROFILES` |

## System Roles

Test with different roles to verify permissions:
- `SYSTEM_ADMIN` - Full access to everything
- `HR_MANAGER` - Manage profiles, attendance, recruitment, leaves, payroll
- `HR_ADMIN` - Manage profiles, attendance, leaves
- `HR_EMPLOYEE` - Manage profiles, view applications
- `DEPARTMENT_HEAD` - View team, conduct appraisals, approve leaves
- `DEPARTMENT_EMPLOYEE` - Self-service only
- `PAYROLL_SPECIALIST` - Payroll management
- `RECRUITER` - Recruitment only

## Troubleshooting

### 401 Unauthorized
- Token expired or invalid
- Run the login request again to get a new token

### 403 Forbidden
- User doesn't have required permission
- Check your system roles and permissions
- Login with a different user account with appropriate permissions

### 404 Not Found
- Invalid `employeeId`, `positionId`, or `requestId`
- Update environment variables with valid IDs

### Token Not Working
- Check that `access_token` variable is set in environment
- Verify Bearer token is configured in Auth tab: `{{access_token}}`
- Check if token is blacklisted (after logout)

## Tips

1. **Use the Local environment** for all requests
2. **Login first** before testing other endpoints
3. **Update employee variables** with actual IDs from your database
4. **Check permissions** if you get 403 errors
5. **Monitor the console** in Thunder Client for detailed error messages
