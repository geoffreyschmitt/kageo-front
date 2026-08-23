'use client';
import {useState} from 'react'

import {signIn, signOut, useSession} from 'next-auth/react'
import {useTranslations} from 'next-intl'

import {Link} from '@/shared/i18n/navigation'
import {LanguageSwitcher} from '@/features/LanguageSwitcher'

import styles from './Header.module.css'

export const Header = () => {
  const {data: session, status} = useSession()
  const t = useTranslations('auth')
  const tNav = useTranslations('nav')
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
                  {tNav('wishlists')}
                </Link>
              </li>
              <li className={styles.header__navItem}>
                <Link href="/history" className={styles.header__navLink}>
                  {tNav('history')}
                </Link>
              </li>
            </ul>
          </nav>
          <div className={styles.header__actions}>
            <LanguageSwitcher />
            <div className={styles.header__loading}>{t('loading')}</div>
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
                <Link href="/wishlists" className={styles.header__navLink}>
                  {tNav('wishlists')}
                </Link>
              </li>
              <li className={styles.header__navItem}>
                <Link href="/history" className={styles.header__navLink}>
                  {tNav('history')}
                </Link>
              </li>
            </ul>
          </nav>
          <div className={styles.header__actions}>
            <LanguageSwitcher />
            {session?.user ? (
              <div className={styles.header__userMenu}>
                <span className={styles.header__userName}>
                  {t('hello', {name: session.user.name || session.user.email || ''})}
                </span>
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
        </div>
      </header>

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
