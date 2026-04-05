# Authentication Setup Guide

## Overview
The Universal CRM now uses Firebase Authentication with Sign In, Sign Up, and Forgot Password features. Roles are properly restricted for security.

## Features Implemented
✅ Email/Password Authentication
✅ Sign In / Sign Up / Forgot Password
✅ Role-based Access Control with Restrictions
✅ User Profile Management
✅ Password Reset via Email
✅ Invitation Code System for Admin Accounts

## Available Portals

| Portal | URL | Access |
|--------|-----|--------|
| **Customer Portal** | https://wasi-app-1.web.app | Self-signup available |
| **Agent Portal** | https://wasi-app-1.web.app/agent | Self-signup available |
| **Admin Portal** | https://wasi-app-1.web.app/admin | Invitation code required |
| **Master Portal** | https://wasi-app-1.web.app/master | Invitation code required |

## Role System & Restrictions

### Customer (Self-Signup Available) ✅
- **What it is:** End users, clients, customers
- **Access:** Customer dashboard and portal
- **Features:** View cases, upload documents, check status, make payments
- **Sign Up:** Available directly - no code needed

### Agent (Self-Signup Available) ✅
- **What it is:** Team members, support agents
- **Access:** Agent dashboard and operations
- **Features:** Manage customers, handle cases, update statuses
- **Sign Up:** Available directly - no code needed

### Admin (Requires Invitation Code) 🔐
- **What it is:** Department/team managers
- **Access:** Admin dashboard, team management, reporting
- **Features:** Manage users, view analytics, configure workflows
- **Sign Up:** Requires valid invitation code
- **Invitation Codes:**
  - `ADMIN2024` → Admin access
  - `MASTER2024` → Master Admin access

### Master Admin (Requires Invitation Code) 🔐
- **What it is:** System owner, full access
- **Access:** Everything - master control panel
- **Features:** Full system access, user management, settings
- **Sign Up:** Requires valid Master Admin invitation code
- **Invitation Code:** `MASTER2024`

## How to Create Accounts

### Step 1: Customer Account (Self-Signup)
1. Visit: https://wasi-app-1.web.app
2. Click "Create Account"
3. Fill in:
   - Full Name
   - Email Address
   - Password (minimum 6 characters)
   - Confirm Password
   - **Select Role: "Customer / Client"**
4. Click "Create Account"
5. ✅ Instant access to customer portal

### Step 2: Agent Account (Self-Signup)
1. Visit: https://wasi-app-1.web.app
2. Click "Create Account"
3. Fill in:
   - Full Name
   - Email Address
   - Password (minimum 6 characters)
   - Confirm Password
   - **Select Role: "Agent / Team Member"**
4. Click "Create Account"
5. ✅ Instant access to agent portal

### Step 3: Admin Account (With Invitation Code)
1. Visit: https://wasi-app-1.web.app
2. Click "Create Account"
3. Fill in all details
4. **Select Role: "Request Admin Access"**
5. **Enter Invitation Code:** `ADMIN2024`
6. Click "Create Account"
7. ✅ Admin portal access granted

### Step 4: Master Admin Account (With Invitation Code)
1. Visit: https://wasi-app-1.web.app
2. Click "Create Account"
3. Fill in all details
4. **Select Role: "Request Admin Access"**
5. **Enter Invitation Code:** `MASTER2024`
6. Click "Create Account"
7. ✅ Full master control access granted

## Adding New Users

### As a Master Admin:
1. Sign in to https://wasi-app-1.web.app/master
2. Go to User Management
3. Click "Add New User"
4. Select role and create

### As a Regular Admin:
1. Sign in to https://wasi-app-1.web.app/admin
2. Go to Team Management
3. Click "Add Team Member"
4. Create agent or customer account

### Via Firebase Console (Direct):
1. Go to: https://console.firebase.google.com/project/wasi-app-1/authentication/users
2. Click "Add User"
3. Enter email and password
4. Click "Create User"

## Changing Roles

Roles can only be changed by admins through:
1. Firebase Console → User Management
2. Admin Portal → User Management interface
3. Master Portal → Full user control

Regular users cannot change their own roles for security.

## Forgot Password

1. On Sign In page, click "Forgot Password?"
2. Enter email address
3. Check email for password reset link
4. Click link and set new password
5. Sign in with new credentials

## Role Descriptions

| Role | Portal Access | Key Permissions |
|------|--------------|-----------------|
| **Customer** | Customer | View own cases, upload docs, payments |
| **Agent** | Agent | Manage customers, handle cases |
| **Admin** | Admin + Agent | Team management, reports, settings |
| **Master Admin** | All Portals | Full system control, user management |

## Security Features

- ✅ Passwords hashed and encrypted
- ✅ Email verification support
- ✅ Password reset via email
- ✅ Session tokens (JWT)
- ✅ HTTPS required
- ✅ Invitation codes for privileged roles
- ✅ No hardcoded accounts or credentials
- ✅ Role-based access control
- ✅ Database security rules

## Important Changes

- ❌ No more demo accounts
- ❌ No hardcoded credentials
- ❌ No "Sir Atif" or "Wasi" references
- ✅ Proper role restrictions
- ✅ Invitation system for admin
- ✅ Customer portal added
- ✅ All names from user accounts

## Firebase Configuration

Project ID: `wasi-app-1`
Auth Domain: `wasi-app-1.firebaseapp.com`
Database: Realtime Database

All user data securely stored in Firebase.

## Troubleshooting

### "User not found" error
- Email not registered yet
- Click "Create Account" to sign up

### "Incorrect password" error
- Check password carefully
- Use "Forgot Password?" to reset

### "Invalid invitation code"
- Check code spelling carefully
- Code must be exact: `ADMIN2024` or `MASTER2024`
- Contact your system administrator if you don't have a code

### Not receiving password reset email
- Check spam/junk folder
- Verify email address is correct
- Wait a few minutes and try again

### Can't see admin option during signup
- Select "Request Admin Access" option
- You'll be prompted for invitation code
- Without valid code, cannot create admin account

## Next Steps

1. ✅ Create customer accounts for users
2. ✅ Create agent accounts for team members
3. ✅ Create admin accounts using ADMIN2024 code
4. ✅ Create master account using MASTER2024 code
5. ✅ Configure teams and assignments
6. ✅ Set up workflows and pipelines
