# CRM Quick Start Guide

## Welcome to Universal CRM Pro! 👋

Your CRM system is now fully deployed with proper role-based security and a dedicated customer portal.

## 🚀 Get Started - Choose Your Role

### For CUSTOMERS/CLIENTS 👤
1. Visit: **https://wasi-app-1.web.app**
2. Click **"Create Account"**
3. Select: **"Customer / Client"** (no code needed)
4. Fill in details and sign up
5. Access: **Customer Portal** at https://wasi-app-1.web.app/customer

### For AGENTS/TEAM MEMBERS 👨‍💼
1. Visit: **https://wasi-app-1.web.app**
2. Click **"Create Account"**
3. Select: **"Agent / Team Member"** (no code needed)
4. Fill in details and sign up
5. Access: **Agent Portal** at https://wasi-app-1.web.app/agent

### For ADMINS ⚙️ (Requires Code)
1. Visit: **https://wasi-app-1.web.app**
2. Click **"Create Account"**
3. Select: **"Request Admin Access"**
4. Enter Invitation Code: **`ADMIN2024`**
5. Fill in details and sign up
6. Access: **Admin Portal** at https://wasi-app-1.web.app/admin

### For MASTER ADMIN 🔑 (Requires Code)
1. Visit: **https://wasi-app-1.web.app**
2. Click **"Create Account"**
3. Select: **"Request Admin Access"**
4. Enter Invitation Code: **`MASTER2024`**
5. Fill in details and sign up
6. Access: **Master Portal** at https://wasi-app-1.web.app/master

## 🔐 Security - Why Role Restrictions?

✅ **Customers can only sign up as Customer/Client**
- Prevents unauthorized admin account creation
- Keeps your system secure
- Admins must be invited

✅ **Agents can only sign up as Agent/Team Member**
- Team members create their own accounts
- Admin can review and approve

✅ **Admin/Master Admin require Invitation Codes**
- Only authorized people can create admin accounts
- Codes: `ADMIN2024` and `MASTER2024`
- Change these codes in production!

## 📱 Portal URLs

| User Type | Portal | URL |
|-----------|--------|-----|
| **Customer** | Customer | https://wasi-app-1.web.app/customer |
| **Agent** | Agent | https://wasi-app-1.web.app/agent |
| **Admin** | Admin | https://wasi-app-1.web.app/admin |
| **Master Admin** | Master | https://wasi-app-1.web.app/master |
| **Login/SignUp** | Main | https://wasi-app-1.web.app |

## ✨ What Each User Can Do

### Customer Portal Features
- 👁️ View all their cases/tickets
- 📄 Upload documents
- 💰 Make payments
- 📞 Send messages
- 📊 Check status

### Agent Portal Features
- 👥 Manage customers
- 📋 Handle cases/tickets
- 📝 Add notes
- 📊 Update statuses
- 📞 Communicate

### Admin Portal Features
- 👨‍💼 Manage team members
- 📊 View analytics/reports
- ⚙️ Configure workflows
- 🎯 Set pricing/rates
- 📈 Monitor performance

### Master Admin Portal Features
- 🔑 Full system access
- 👥 Create/manage all users
- 🏢 Multi-team management
- ⚙️ System settings
- 📊 Advanced analytics

## 🔑 Invitation Codes (Change in Production!)

**IMPORTANT:** These are default codes. Change them:

| Code | Role | Default | Status |
|------|------|---------|--------|
| `ADMIN2024` | Admin | ✅ Active | CHANGE THIS |
| `MASTER2024` | Master Admin | ✅ Active | CHANGE THIS |

To change codes:
1. Edit `/index.html` line ~220
2. Update `VALID_INVITE_CODES` object
3. Redeploy with `firebase deploy`

## 🔓 Forgot Password

Works for all users:

1. On Sign In page, click **"Forgot Password?"**
2. Enter your email
3. Check email for reset link
4. Click link to set new password
5. Sign in with new password

## 🆘 Troubleshooting

### "Invalid role selection"
- Choose correct role for your type
- Customers → "Customer / Client"
- Agents → "Agent / Team Member"
- Admins → "Request Admin Access" + code

### "Invalid invitation code"
- Check spelling: `ADMIN2024` or `MASTER2024`
- Must be exact case
- No spaces or special characters
- Contact admin if code is wrong

### Can't find admin option
- Click dropdown that says "Select Your Role"
- Third option should be "Request Admin Access"
- Click it to show invitation code field

### Not receiving emails
- Check spam/junk folder
- Verify email address
- Wait 2-3 minutes and retry

## 📋 Initial Setup Checklist

- [ ] Sign in to main portal
- [ ] Create master admin account (use `MASTER2024`)
- [ ] Create admin accounts (use `ADMIN2024`)
- [ ] Create agent accounts (no code needed)
- [ ] Create customer accounts (no code needed)
- [ ] Configure business type
- [ ] Set up workflows/pipelines
- [ ] Invite team members

## 👥 User Management

### Creating Customer Accounts
- Customers sign up themselves
- Or admin creates via User Management
- Role restricted to "Customer"

### Creating Agent Accounts
- Agents sign up themselves
- Or admin creates via User Management
- Role restricted to "Agent"

### Creating Admin Accounts
- Requires `ADMIN2024` invitation code
- Only during signup
- Or created by Master Admin

### Creating Master Admin
- Requires `MASTER2024` invitation code
- Only during first setup
- Or created in Firebase Console

## 🎯 Next Steps

1. ✅ Create master admin account
2. ✅ Create admin accounts for managers
3. ✅ Add agent accounts for team
4. ✅ Add customer accounts
5. ✅ Configure CRM settings
6. ✅ Set up pipelines
7. ✅ Start managing!

---

**Questions?** Check [AUTH_SETUP.md](AUTH_SETUP.md) or the [Firebase Console](https://console.firebase.google.com/project/wasi-app-1)

Good luck! 🚀
