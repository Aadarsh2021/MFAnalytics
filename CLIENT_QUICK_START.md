# Quick Start - For Client (Non-Technical)

## 🎯 Your System is 100% Automatic

**Good news:** After one-time setup, you never need to touch anything!

---

## ✅ One-Time Setup (15 Minutes)

### Step 1: Add GitHub Secrets

1. Go to: `https://github.com/YOUR_USERNAME/MFP/settings/secrets/actions`
2. Click "New repository secret"
3. Add these 3 secrets:

```
Name: FRED_API_KEY
Value: 5e1b06fcd9ed77b5a46c643fd982a485

Name: DATA_GOV_IN_API_KEY  
Value: 579b464db66ec23bdd000001cbfa6d80df334c254b2a9ba8596d5ed9

Name: FIREBASE_TOKEN
Value: [Get from: firebase login:ci]
```

### Step 2: Test It Works

1. Go to: `https://github.com/YOUR_USERNAME/MFP/actions`
2. Click "Update India Macro Data"
3. Click "Run workflow" → "Run workflow"
4. Wait 2 minutes
5. See green checkmark ✅

**Done! That's it!** 🎉

---

## 🤖 What Happens Now (Automatic)

### Every Month (15th at 10 AM)

- ✅ System wakes up automatically
- ✅ Fetches latest India data
- ✅ Updates your website
- ✅ Sends you email notification

### Your Work

- ✅ **ZERO!** Nothing to do!

---

## 📧 Get Email Notifications

1. Go to your GitHub repo
2. Click "Watch" (top right)
3. Select "Custom" → Check "Actions"
4. Done!

Now you get email when:

- ✅ Update succeeds (monthly)
- ❌ Update fails (rare)

---

## 🔄 Manual Update (Optional)

Need to update before 15th?

1. Go to: `https://github.com/YOUR_USERNAME/MFP/actions`
2. Click "Update India Macro Data"
3. Click "Run workflow"
4. Wait 2 minutes
5. Done! ✅

**Takes:** 30 seconds  
**Needed:** Rarely (system auto-updates monthly)

---

## 🚨 If Something Breaks

### Quick Fix (5 Minutes)

```bash
# Open terminal in project folder
npm run update-macro-india
firebase deploy
```

### Get Help

- Check: `https://github.com/YOUR_USERNAME/MFP/actions`
- Look for red X
- Click it to see error
- Contact developer with error message

---

## ✅ Summary

**Setup:** 15 minutes (one-time)  
**Monthly work:** ZERO!  
**System:** Fully automatic  
**Next update:** 15th of every month  

**You're all set! System runs itself!** 🚀

---

## 📞 Quick Links

**Manual Update:**  
<https://github.com/YOUR_USERNAME/MFP/actions>

**Check Status:**  
<https://github.com/YOUR_USERNAME/MFP/actions>

**Full Guide:**  
See `zero_maintenance_guide.md` for details

**Emergency:**  
Run: `npm run update-macro-india && firebase deploy`
