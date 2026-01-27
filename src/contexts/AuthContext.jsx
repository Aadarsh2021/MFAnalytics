import { createContext, useContext, useState, useEffect } from 'react'
import {
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    setPersistence,
    browserLocalPersistence
} from 'firebase/auth'
import { auth } from '../firebase'

const AuthContext = createContext({})

export const useAuth = () => useContext(AuthContext)

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        // Set persistence to local (survives browser restarts)
        setPersistence(auth, browserLocalPersistence)

        // Listen for auth state changes
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setUser(user)
            setLoading(false)
        })

        return unsubscribe
    }, [])

    const login = async (email, password) => {
        try {
            const result = await signInWithEmailAndPassword(auth, email, password)
            return { success: true, user: result.user }
        } catch (error) {
            return { success: false, error: error.message }
        }
    }

    const logout = async () => {
        try {
            await signOut(auth)
            return { success: true }
        } catch (error) {
            return { success: false, error: error.message }
        }
    }

    const value = {
        user,
        login,
        logout,
        loading
    }

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    )
}
