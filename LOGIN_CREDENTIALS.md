# 🔐 Login Credentials - MF Analytics Platform

## Test Account Created

**Full Name:** Aadarsh Thakur  
**Email:** <advisor@mfanalytics.com>  
**Password:** Admin@123

---

## How to Login

1. Open your browser and navigate to: **<http://localhost:3000>**
2. You will be automatically redirected to the login page
3. Enter the credentials above
4. Click "Sign In"
5. You'll be redirected to the dashboard with sidebar visible

---

## What You'll See After Login

✅ **Sidebar** with your profile:

- Avatar with "A" (first letter of your name)
- Full Name: "Aadarsh Thakur"
- Email: "<advisor@mfanalytics.com>"

✅ **Dashboard** with all features accessible

✅ **Logout Button** at the bottom of sidebar

---

## Testing the Authentication Flow

### Test 1: Login

- Navigate to <http://localhost:3000/login>
- Enter credentials above
- ✅ Should redirect to homepage with sidebar

### Test 2: Protected Routes

- Try accessing <http://localhost:3000> without login (incognito)
- ✅ Should redirect to /login

### Test 3: Logout

- Click the logout button in sidebar
- ✅ Should redirect to /login
- ✅ Sidebar should disappear

### Test 4: Session Persistence

- Login successfully
- Refresh the page
- ✅ Should stay logged in

---

## Create More Accounts

To create additional test accounts, go to:
**<http://localhost:3000/register>**

Fill in:

- Full Name
- Email
- Password (minimum 8 characters)
- Confirm Password

---

## Backend API Endpoints

- **Register:** POST <http://localhost:8001/api/auth/register>
- **Login:** POST <http://localhost:8001/api/auth/login>
- **Get User:** GET <http://localhost:8001/api/auth/me>
- **Logout:** POST <http://localhost:8001/api/auth/logout>
- **Refresh Token:** POST <http://localhost:8001/api/auth/refresh>

---

## Notes

- Passwords are hashed using bcrypt
- JWT tokens are stored in localStorage
- Access token expires in 30 minutes
- Refresh token expires in 7 days
