# Security Configuration Guide

## IMPORTANT: Change Default Settings!

Your CRM comes with default invitation codes for testing. **These MUST be changed before production deployment!**

## 🔐 Default Invitation Codes (CHANGE THESE!)

| Code | Purpose | Current Value | Status |
|------|---------|----------------|--------|
| Admin Code | Allow admin signup | `ADMIN2024` | ⚠️ CHANGE THIS |
| Master Code | Allow master admin signup | `MASTER2024` | ⚠️ CHANGE THIS |

## How to Change Invitation Codes

### Method 1: Edit HTML (Quickest)

1. Open file: `index.html`
2. Find this section (around line 220):
   ```javascript
   const VALID_INVITE_CODES = {
     'MASTER2024': 'master_admin',
     'ADMIN2024': 'admin'
   };
   ```

3. Replace with your own codes:
   ```javascript
   const VALID_INVITE_CODES = {
     'YOUR_MASTER_CODE_HERE': 'master_admin',
     'YOUR_ADMIN_CODE_HERE': 'admin'
   };
   ```

4. Example:
   ```javascript
   const VALID_INVITE_CODES = {
     'SEC@re2024Master': 'master_admin',
     'AdminCode2024SE': 'admin'
   };
   ```

5. Save file
6. Deploy: `firebase deploy --only hosting --project wasi-app-1`

### Method 2: Firebase Functions (Recommended for Production)

For increased security, move codes to Firebase backend:

1. Create Cloud Function to validate codes
2. Store codes in Firestore (encrypted)
3. Rotate codes periodically
4. Log every code use

(Contact your Firebase consultant for implementation)

## 🛡️ Security Recommendations

### 1. Strong Invitation Codes
- ✅ Mix uppercase and lowercase
- ✅ Include numbers
- ✅ Use special characters
- ✅ At least 12 characters
- ✅ Change codes every 90 days

**Examples:**
- `Sec@Master2024!`
- `Adm!nCode#2024`
- `Master$Key%2024`

### 2. Password Requirements
The system enforces:
- ✅ Minimum 6 characters
- ✅ No spaces allowed
- ✅ Email validation
- ✅ Confirmation password

**For production, recommend users:**
- ✅ 12+ characters
- ✅ Mix of uppercase/lowercase
- ✅ Numbers and special characters
- ✅ Unique per person
- ✅ Changed every 60-90 days

### 3. Access Control
Current implementation:
- ✅ Role-based access
- ✅ Invitation code requirement for admins
- ✅ Self-signup only for customer/agent
- ✅ Database security rules

**For production, add:**
- ✅ Two-factor authentication (2FA)
- ✅ Email verification
- ✅ IP whitelist
- ✅ Session timeout (15-30 min)
- ✅ Account lockout after failed attempts

### 4. Firebase Security Rules
Currently deployed: `database.rules.json`

Includes:
- ✅ User role validation
- ✅ Permission checks
- ✅ Data isolation
- ✅ Audit logging

**Review rules in:**
- Firebase Console → Database → Rules
- Review: `database.rules.json`

### 5. API Key Security
Your Firebase config is in `index.html` (public is OK):
```javascript
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyD2YGTqzuZUAhijS-N-XBmx8H3dGPIfRb8",
  authDomain: "wasi-app-1.firebaseapp.com",
  databaseURL: "https://wasi-app-1.firebaseio.com",
  projectId: "wasi-app-1",
  storageBucket: "wasi-app-1.firebasestorage.app",
  messagingSenderId: "629671315196",
  appId: "1:629671315196:web:8966f89b887bb83c0db979"
}
```

This API key is restricted to:
- ✅ Authentication only (Firebase Auth)
- ✅ Specific domain (wasi-app-1.web.app)
- ✅ Database rules enforced

**For production:**
1. Go to: https://console.firebase.google.com/project/wasi-app-1/settings/apikeys
2. Review API Key restrictions
3. Ensure only needed services enabled

## 🔄 First-Time Setup Security

1. **Generate Secure Codes** (15 min)
   - Create new master code
   - Create new admin code
   - Save in secure location

2. **Update Codes** (10 min)
   - Edit `index.html`
   - Replace with your codes
   - Test signup with new codes

3. **Deploy Changes** (5 min)
   - `firebase deploy --only hosting --project wasi-app-1`
   - Verify deployment

4. **Create Master Account** (5 min)
   - Use your new master code
   - Create first master admin account
   - Save credentials securely

5. **Create Admin Accounts** (10 min)
   - Create admin accounts using new admin code
   - Give codes only to trusted people

6. **Rotate Codes** (Monthly)
   - Keep a code rotation schedule
   - Change codes every 30-90 days
   - Email new codes to authorized users only

## 📊 Checklist - Before Going Live

- [ ] Changed default invitation codes
- [ ] Generated strong replacement codes
- [ ] Updated `index.html` with new codes
- [ ] Deployed changes to Firebase
- [ ] Tested signup with new codes
- [ ] Created master admin account
- [ ] Created admin accounts
- [ ] Reviewed Firebase security rules
- [ ] Enabled API key restrictions
- [ ] Set up email for password resets
- [ ] Configured domain SSL/HTTPS
- [ ] Set up user manual/documentation
- [ ] Created backup of credentials
- [ ] Tested all portal access

## 🆘 If You Forget the Codes

### Quick Recovery:
1. Go to `index.html`
2. Search for `VALID_INVITE_CODES`
3. See current codes there

### If Lost:
1. Edit `index.html`
2. Set new codes
3. Redeploy
4. Create new master account with new codes

## 📋 Sample Secure Configuration

**For your production setup:**

```javascript
// Example - DO NOT USE THESE!
const VALID_INVITE_CODES = {
  'MasterK3y!2024Sec': 'master_admin',
  'AdminAccess#2024!': 'admin'
};
```

## 🔄 Ongoing Security

### Monthly:
- [ ] Review failed login attempts
- [ ] Check new user signups
- [ ] Verify team member access
- [ ] Review audit logs

### Quarterly:
- [ ] Rotate invitation codes
- [ ] Review security rules
- [ ] Update admin accounts
- [ ] Change master password

### Annually:
- [ ] Full security audit
- [ ] Update documentation
- [ ] Review all users and roles
- [ ] Plan security improvements

## ⚠️ Known Limitation: Compiled JS Assets

The compiled React JS files in `/assets/` were built with an older auth system and still contain:
- Hardcoded demo agent names (Imran Khan, Faizan, Safeer, Aynee)
- Hardcoded backdoor user credentials in `index-DHxZuIUT.js`
- Fallback demo data when expected localStorage keys are missing

**Mitigation applied:**
- ✅ `index.html` Firebase auth **bridges** to the React app's expected localStorage keys
- ✅ On every page load, old demo sessions are **purged** before Firebase auth initializes
- ✅ If `crm_current_user` is missing, ALL React auth keys are cleared
- ✅ The auth modal enforces Firebase authentication and blocks access to the React app

**Full fix:**
To completely remove the hardcoded data, the React app must be **rebuilt from source** with the demo fallbacks removed. The current deployment is a working bridge solution.

---

## 🚨 Emergency Procedures

### If Master Code Compromised:
1. Edit `index.html` immediately
2. Change master code
3. Redeploy with `firebase deploy`
4. Review recent account creations
5. Disable unauthorized accounts

### If Admin Code Compromised:
1. Change admin code in `index.html`
2. Redeploy
3. Review admin account creations
4. Revoke unauthorized access

### If Email Compromised:
1. Update password immediately
2. Check login history in Firebase Console
3. Review recent actions
4. Change confirmation email

## 📞 Support

For security concerns:
- Email: your-admin@company.com
- Phone: Your support number
- Escalate critical issues immediately

---

**CRITICAL REMINDER:** Change default invitation codes before using in production!

**Status:** ⚠️ Currently using demo codes - CHANGE BEFORE PRODUCTION
**Last Updated:** April 4, 2026
