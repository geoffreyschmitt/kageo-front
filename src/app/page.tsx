import Link from "next/link"
import pageStyles from "./page.module.css"

export default function HomePage() {
    return (
        <main className={pageStyles.pageLayout}>
            <section className={pageStyles.hero}>
                <div className={pageStyles.hero__content}>
                    <h1 className={pageStyles.hero__title}>Organize Your Desires, Share Your Dreams.</h1>
                    <p className={pageStyles.hero__description}>
                        Kageo is the ultimate platform to create, manage, and share personalized wishlists for any occasion. From
                        birthdays to holidays, make sure you get exactly what you want, and help others do the same!
                    </p>
                    <div className={pageStyles.hero__actions}>
                        <Link href="/wishlist" className={pageStyles.hero__buttonPrimary}>
                            Get Started - It&#39;s Free!
                        </Link>
                        <Link href="/features" className={pageStyles.hero__buttonSecondary}>
                            Learn More
                        </Link>
                    </div>
                </div>
                <div className={pageStyles.hero__imageContainer}>
                    <img
                        src="/placeholder.svg?height=400&width=600"
                        alt="Wishlist illustration"
                        className={pageStyles.hero__image}
                    />
                </div>
            </section>

            <section className={pageStyles.features}>
                <h2 className={pageStyles.features__title}>Why Choose Kageo?</h2>
                <div className={pageStyles.features__grid}>
                    <div className={pageStyles.featureCard}>
                        <div className={pageStyles.featureCard__icon}>✨</div>
                        <h3 className={pageStyles.featureCard__title}>Effortless Creation</h3>
                        <p className={pageStyles.featureCard__description}>
                            Quickly add items with details, images, and links. Organize them by priority and status.
                        </p>
                    </div>
                    <div className={pageStyles.featureCard}>
                        <div className={pageStyles.featureCard__icon}>🤝</div>
                        <h3 className={pageStyles.featureCard__title}>Seamless Collaboration</h3>
                        <p className={pageStyles.featureCard__description}>
                            Invite friends and family to view, suggest, or even mark items as purchased.
                        </p>
                    </div>
                    <div className={pageStyles.featureCard}>
                        <div className={pageStyles.featureCard__icon}>🎁</div>
                        <h3 className={pageStyles.featureCard__title}>Never Miss a Gift</h3>
                        <p className={pageStyles.featureCard__description}>
                            Ensure you receive thoughtful gifts by sharing exactly what you desire.
                        </p>
                    </div>
                    <div className={pageStyles.featureCard}>
                        <div className={pageStyles.featureCard__icon}>🔒</div>
                        <h3 className={pageStyles.featureCard__title}>Privacy Control</h3>
                        <p className={pageStyles.featureCard__description}>
                            Keep wishlists private or make them public for easy sharing. You&#39;re in control.
                        </p>
                    </div>
                </div>
            </section>

            <section className={pageStyles.cta}>
                <h2 className={pageStyles.cta__title}>Ready to Start Your Wishlist Journey?</h2>
                <p className={pageStyles.cta__description}>
                    Join thousands of happy users who are simplifying their gift-giving and receiving with Kageo.
                </p>
                <Link href="/wishlist" className={pageStyles.cta__button}>
                    Create Your First Wishlist Now
                </Link>
            </section>
        </main>
    )
}
