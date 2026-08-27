'use client';
import {useEffect, useState} from 'react'

import {signIn, signOut, useSession} from 'next-auth/react'
import {useTranslations} from 'next-intl'

import {Link, usePathname} from '@/shared/i18n/navigation'
import {LanguageSwitcher} from '@/features/LanguageSwitcher'
import {eventBus} from '@/shared/eventBus'

import styles from './Header.module.css'

export const Header = () => {
  const {data: session, status} = useSession()
  const t = useTranslations('auth')
  const tNav = useTranslations('nav')
  const pathname = usePathname()
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [isLogin, setIsLogin] = useState(true)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    return eventBus.on('auth:openLoginModal', () => setShowAuthModal(true))
  }, [])

  // Close the mobile drawer whenever the route changes.
  useEffect(() => {
    setMenuOpen(false)
  }, [pathname])

  // Lock body scroll and close on Escape while the drawer is open.
  useEffect(() => {
    if (!menuOpen) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = ''
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [menuOpen])

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
        setError(t('invalidCredentials'))
      } else {
        setShowAuthModal(false)
        setFormData({email: '', password: '', name: ''})
      }
    } else {
      try {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify(formData)
        })

        if (res.ok) {
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
          setError(data.message || t('registrationFailed'))
        }
      } catch {
        setError(t('networkError'))
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

  const openLoginModal = () => {
    setMenuOpen(false)
    setShowAuthModal(true)
  }

  const closeModal = () => {
    setShowAuthModal(false)
    setError('')
    setFormData({email: '', password: '', name: ''})
  }

  const navItems = [
    {href: '/wishlists', label: tNav('wishlists')},
    {href: '/history', label: tNav('history')}
  ]

  const isLoading = status === 'loading'
  const displayName = session?.user?.name || session?.user?.email || ''
  const avatarInitial = displayName.trim().charAt(0).toUpperCase() || '?'

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
              {navItems.map((item) => (
                <li key={item.href} className={styles.header__navItem}>
                  <Link href={item.href} className={styles.header__navLink}>
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <div className={styles.header__actions}>
            <LanguageSwitcher />
            {isLoading ? (
              <div className={styles.header__loading}>{t('loading')}</div>
            ) : session?.user ? (
              <div className={styles.header__userMenu}>
                <Link href="/profile" className={styles.header__userName}>
                  {t('hello', {name: displayName})}
                </Link>
                <button
                  onClick={handleSignOut}
                  className={styles.header__logoutButton}
                >
                  {t('logout')}
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowAuthModal(true)}
                className={styles.header__loginButton}
              >
                {t('login')}
              </button>
            )}
          </div>
          <button
            type="button"
            className={styles.header__menuToggle}
            aria-label={tNav('openMenu')}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(true)}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          </button>
        </div>
      </header>

      <div
        className={`${styles.drawer__overlay} ${menuOpen ? styles['drawer__overlay--open'] : ''}`}
        onClick={() => setMenuOpen(false)}
        aria-hidden="true"
      />
      <aside
        className={`${styles.drawer} ${menuOpen ? styles['drawer--open'] : ''}`}
        aria-hidden={!menuOpen}
      >
        <div className={styles.drawer__head}>
          <button
            type="button"
            className={styles.drawer__close}
            aria-label={tNav('closeMenu')}
            onClick={() => setMenuOpen(false)}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <nav className={styles.drawer__nav}>
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className={styles.drawer__navLink}>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className={styles.drawer__divider} />

        <div className={styles.drawer__row}>
          <span className={styles.drawer__rowLabel}>{tNav('language')}</span>
          <LanguageSwitcher />
        </div>

        <div className={styles.drawer__spacer} />

        {isLoading ? null : session?.user ? (
          <>
            <div className={styles.drawer__divider} />
            <Link href="/profile" className={styles.drawer__profile}>
              <span className={styles.drawer__avatar}>{avatarInitial}</span>
              <span className={styles.drawer__profileText}>
                <span className={styles.drawer__profileName}>{displayName}</span>
                <span className={styles.drawer__profileLink}>{tNav('viewProfile')}</span>
              </span>
            </Link>
            <button
              onClick={handleSignOut}
              className={styles.drawer__logout}
            >
              {t('logout')}
            </button>
          </>
        ) : (
          <button
            onClick={openLoginModal}
            className={styles.drawer__login}
          >
            {t('login')}
          </button>
        )}
      </aside>

      {showAuthModal && (
        <div className={styles.modal__overlay} onClick={closeModal}>
          <div className={styles.modal__content} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modal__header}>
              <h2>{isLogin ? t('login') : t('signUp')}</h2>
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
                  <label htmlFor="name">{t('name')}</label>
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
                <label htmlFor="email">{t('email')}</label>
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
                <label htmlFor="password">{t('password')}</label>
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
                {loading ? t('pleaseWait') : (isLogin ? t('login') : t('signUp'))}
              </button>
            </form>

            <div className={styles.auth__divider}>
              <span>{t('or')}</span>
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
              {t('continueWithGoogle')}
            </button>

            <div className={styles.auth__switch}>
              {isLogin ? t('noAccount') + ' ' : t('hasAccount') + ' '}
              <button
                type="button"
                onClick={() => {
                  setIsLogin(!isLogin)
                  setError('')
                  setFormData({email: '', password: '', name: ''})
                }}
                className={styles.switch__button}
              >
                {isLogin ? t('signUpLink') : t('loginLink')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
