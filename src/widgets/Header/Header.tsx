'use client';
import {useState} from 'react'

import Link from 'next/link'

import {signIn, signOut, useSession} from 'next-auth/react'

import styles from './Header.module.css'

export const Header = () => {
  const {data: session, status} = useSession()
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [isLogin, setIsLogin] = useState(true)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (isLogin) {
      const result = await signIn('credentials', {
        email: formData.email,
        password: formData.password,
        redirect: false
      })

      if (result?.error) {
        setError('Invalid credentials')
      } else {
        setShowAuthModal(false)
        setFormData({email: '', password: '', name: ''})
      }
    } else {
      // Register
      try {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify(formData)
        })

        if (res.ok) {
          // Auto login after registration
          const result = await signIn('credentials', {
            email: formData.email,
            password: formData.password,
            redirect: false
          })

          if (!result?.error) {
            setShowAuthModal(false)
            setFormData({email: '', password: '', name: ''})
          }
        } else {
          const data = await res.json()
          setError(data.message || 'Registration failed')
        }
      } catch {
        setError('Network error')
      }
    }
    setLoading(false)
  }

  const handleGoogleSignIn = () => {
    signIn('google')
  }

  const handleSignOut = () => {
    signOut()
  }

  const closeModal = () => {
    setShowAuthModal(false)
    setError('')
    setFormData({email: '', password: '', name: ''})
  }

  if (status === 'loading') {
    return (
      <header className={styles.header}>
        <div className={styles.header__container}>
          <div className={styles.header__logo}>
            <Link href="/" className={styles.header__logoLink}>
              Kageo
            </Link>
          </div>
          <nav className={styles.header__nav}>
            <ul className={styles.header__navList}>
              <li className={styles.header__navItem}>
                <Link href="/wishlists" className={styles.header__navLink}>
                  Wishlists
                </Link>
              </li>
            </ul>
          </nav>
          <div className={styles.header__actions}>
            <div className={styles.header__loading}>Loading...</div>
          </div>
        </div>
      </header>
    )
  }

  return (
    <>
      <header className={styles.header}>
        <div className={styles.header__container}>
          <div className={styles.header__logo}>
            <Link href="/" className={styles.header__logoLink}>
              Kageo
            </Link>
          </div>
          <nav className={styles.header__nav}>
            <ul className={styles.header__navList}>
              <li className={styles.header__navItem}>
                <Link href="/wishlist" className={styles.header__navLink}>
                  Wishlists
                </Link>
              </li>
            </ul>
          </nav>
          <div className={styles.header__actions}>
            {session?.user ? (
              <div className={styles.header__userMenu}>
                                <span className={styles.header__userName}>
                                    Hello, {session.user.name || session.user.email}
                                </span>
                <button
                  onClick={handleSignOut}
                  className={styles.header__logoutButton}
                >
                  Logout
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowAuthModal(true)}
                className={styles.header__loginButton}
              >
                Login
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Auth Modal */}
      {showAuthModal && (
        <div className={styles.modal__overlay} onClick={closeModal}>
          <div className={styles.modal__content} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modal__header}>
              <h2>{isLogin ? 'Login' : 'Sign Up'}</h2>
              <button
                className={styles.modal__close}
                onClick={closeModal}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className={styles.auth__form}>
              {!isLogin && (
                <div className={styles.form__group}>
                  <label htmlFor="name">Name</label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required={!isLogin}
                    className={styles.form__input}
                  />
                </div>
              )}

              <div className={styles.form__group}>
                <label htmlFor="email">Email</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  className={styles.form__input}
                />
              </div>

              <div className={styles.form__group}>
                <label htmlFor="password">Password</label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  required
                  className={styles.form__input}
                />
              </div>

              {error && <div className={styles.error__message}>{error}</div>}

              <button
                type="submit"
                disabled={loading}
                className={styles.form__submit}
              >
                {loading ? 'Please wait...' : (isLogin ? 'Login' : 'Sign Up')}
              </button>
            </form>

            <div className={styles.auth__divider}>
              <span>or</span>
            </div>

            <button
              onClick={handleGoogleSignIn}
              className={styles.google__button}
            >
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </button>

            <div className={styles.auth__switch}>
              {isLogin ? 'Don\'t have an account? ' : 'Already have an account? '}
              <button
                type="button"
                onClick={() => {
                  setIsLogin(!isLogin)
                  setError('')
                  setFormData({email: '', password: '', name: ''})
                }}
                className={styles.switch__button}
              >
                {isLogin ? 'Sign up' : 'Login'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}