# EmailJS Setup - Complete Guide

Contact form ko email bhejne ke liye EmailJS setup karna padega. Ye bilkul free hai (200 emails/month).

## Step 1: EmailJS Account Banao

1. **Website kholo**: <https://www.emailjs.com/>
2. **Sign Up karo**:
   - "Sign Up" button pe click karo
   - Email aur password dalo
   - Ya Google account se sign in karo (recommended)
3. **Email verify karo**: Apne email inbox check karo aur verification link pe click karo

## Step 2: Email Service Add Karo

1. **Dashboard kholo**: Login karne ke baad dashboard dikhega
2. **"Email Services" pe jao**: Left sidebar mein "Email Services" option pe click karo
3. **"Add New Service" click karo**
4. **Gmail select karo** (ya jo bhi email use karna hai):
   - Gmail icon pe click karo
   - "Connect Account" button dabao
   - Apne Gmail account se login karo
   - EmailJS ko permission do
5. **Service ID copy karo**:
   - Service successfully add hone ke baad ek **Service ID** milega (jaise: `service_abc123`)
   - Isko copy karke safe jagah save karo

## Step 3: Email Template Banao

1. **"Email Templates" pe jao**: Left sidebar mein click karo
2. **"Create New Template" button dabao**
3. **Template customize karo**:

   **Subject Line mein ye likho:**

   ```
   New Contact Form - {{from_name}}
   ```

   **Content/Body mein ye copy-paste karo:**

   ```
   You have received a new message from your website contact form:

   Name: {{from_name}}
   Email: {{from_email}}
   Phone: {{phone}}

   Message:
   {{message}}

   ---
   Sent from Portfolio Advisor Contact Form
   ```

4. **Settings check karo**:
   - "To Email" mein apna email address dalo jahan messages receive karne hain
   - "From Name" mein `{{from_name}}` rakho
   - "Reply To" mein `{{from_email}}` rakho

5. **Save karo aur Template ID copy karo**:
   - "Save" button dabao
   - Template ID dikhega (jaise: `template_xyz789`)
   - Isko bhi copy karke save karo

## Step 4: Public Key Lo

1. **"Account" section mein jao**: Left sidebar mein "Account" pe click karo
2. **"General" tab kholo**
3. **Public Key copy karo**:
   - "Public Key" section mein ek key dikhegi (jaise: `abcXYZ123_456`)
   - Isko copy karo

## Step 5: Code Mein Values Update Karo

Ab `LandingPage.jsx` file mein apni values dalni hain:

1. **File kholo**: `src/pages/LandingPage.jsx`
2. **Line 59-68 dhundo** (handleSubmit function ke andar)
3. **Ye 3 values replace karo**:

```javascript
await emailjs.send(
    'service_abc123',      // ← Apna Service ID yahan dalo
    'template_xyz789',     // ← Apna Template ID yahan dalo
    {
        from_name: formData.name,
        from_email: formData.email,
        phone: formData.phone || 'Not provided',
        message: formData.message,
    },
    'abcXYZ123_456'       // ← Apna Public Key yahan dalo
)
```

**Example:**

```javascript
await emailjs.send(
    'service_m8k9j2l',           // Tumhara actual Service ID
    'template_contact_form',      // Tumhara actual Template ID
    {
        from_name: formData.name,
        from_email: formData.email,
        phone: formData.phone || 'Not provided',
        message: formData.message,
    },
    'user_Xy7Zp2QrS4TuVwXy'      // Tumhara actual Public Key
)
```

## Step 6: Test Karo

1. **Dev server chalu karo** (agar nahi chal raha):

   ```bash
   npm run dev
   ```

2. **Browser mein kholo**: <http://localhost:5173>

3. **Contact Us button pe click karo**

4. **Form bharo**:
   - Name: Test User
   - Email: <test@example.com>
   - Phone: 1234567890
   - Message: This is a test message

5. **"Send Message" dabao**

6. **Email check karo**:
   - Apne email inbox mein jao (jo tumne template mein "To Email" mein dala tha)
   - Test message aana chahiye
   - Agar nahi aaya to spam folder check karo

## Step 7: Deploy Karo

Sab kuch test hone ke baad deploy karo:

```bash
npm run build
firebase deploy
```

## Troubleshooting

### Email nahi aa raha?

1. **Console check karo**: Browser console (F12) mein errors dekho
2. **Service ID/Template ID/Public Key verify karo**: Sahi copy kiya hai?
3. **EmailJS Dashboard check karo**: "Logs" section mein dekho ki request aayi ya nahi
4. **Spam folder dekho**: Kabhi-kabhi emails spam mein jate hain
5. **Free tier limit**: 200 emails/month se zyada to nahi bhej diye?

### Common Errors

- **"Service ID not found"**: Service ID galat hai, EmailJS dashboard se dobara check karo
- **"Template ID not found"**: Template ID galat hai
- **"Public key is invalid"**: Public Key galat hai ya spaces aa gayi hain

## Important Notes

- ✅ Free tier: 200 emails/month (kaafi hai testing ke liye)
- ✅ No backend needed: Sab kuch frontend se hi kaam karega
- ✅ Secure: Public key safe hai, koi misuse nahi kar sakta
- ⚠️ Production ke liye: Agar zyada emails bhejne hain to paid plan lo

## Support

Agar koi problem aaye to:

1. EmailJS documentation: <https://www.emailjs.com/docs/>
2. Ya mujhe batao, main help karunga!
