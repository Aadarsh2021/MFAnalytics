// Setup script to create admin user in Firebase
// Run this once to create the admin account

import { createUserWithEmailAndPassword } from 'firebase/auth'
import { auth } from './src/firebase.js'

const ADMIN_EMAIL = 'admin@revestenterprises.com'
const ADMIN_PASSWORD = 'Revest@2026'

async function createAdminUser() {
    try {
        const userCredential = await createUserWithEmailAndPassword(
            auth,
            ADMIN_EMAIL,
            ADMIN_PASSWORD
        )
        console.log('✅ Admin user created successfully!')
        console.log('Email:', ADMIN_EMAIL)
        console.log('Password:', ADMIN_PASSWORD)
        console.log('User ID:', userCredential.user.uid)
        process.exit(0)
    } catch (error) {
        if (error.code === 'auth/email-already-in-use') {
            console.log('✅ Admin user already exists!')
            console.log('Email:', ADMIN_EMAIL)
            console.log('Password:', ADMIN_PASSWORD)
        } else {
            console.error('❌ Error creating admin user:', error.message)
        }
        process.exit(0)
    }
}

createAdminUser()
