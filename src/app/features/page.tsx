import Link from "next/link"
import Image from "next/image"
import styles from "./page.module.css"

export default function FeaturesPage() {
    return (
        <main className={styles.featuresPageLayout}>
            <section className={styles.featuresHero}>
                <div className={styles.featuresHero__content}>
                    <h1 className={styles.featuresHero__title}>Unlock the Full Potential of Your Wishlists</h1>
                    <p className={styles.featuresHero__description}>
                        Discover how Kageo makes managing your desires and coordinating gifts simpler and more fun than ever before.
                        From effortless item tracking to seamless collaboration, we've got you covered.
                    </p>
                    <Link href="/wishlist" className={styles.featuresHero__ctaButton}>
                        Start Your Dream Wishlist
                    </Link>
                </div>
            </section>

            <section className={styles.featureSection}>
                <div className={styles.featureSection__header}>
                    <h2 className={styles.featureSection__title}>Effortless Item Management</h2>
                    <p className={styles.featureSection__description}>
                        Add, organize, and track your desired items with intuitive tools designed for clarity and control.
                    </p>
                </div>
                <div className={styles.featureSection__grid}>
                    <div className={styles.featureCard}>
                        <Image
                            src="/placeholder.svg?height=100&width=100"
                            alt="Add Item Icon"
                            width={100}
                            height={100}
                            className={styles.featureCard__icon}
                        />
                        <h3 className={styles.featureCard__title}>Quick Add & Details</h3>
                        <p className={styles.featureCard__text}>
                            Easily add items with names, descriptions, prices, and direct purchase links. Include images and notes for
                            perfect clarity.
                        </p>
                    </div>
                    <div className={styles.featureCard}>
                        <Image
                            src="/placeholder.svg?height=100&width=100"
                            alt="Priority Icon"
                            width={100}
                            height={100}
                            className={styles.featureCard__icon}
                        />
                        <h3 className={styles.featureCard__title}>Priority & Status Tracking</h3>
                        <p className={styles.featureCard__text}>
                            Set priorities (low, medium, high) and track item status (wanted, reserved, purchased) to keep everyone
                            informed.
                        </p>
                    </div>
                    <div className={styles.featureCard}>
                        <Image
                            src="/placeholder.svg?height=100&width=100"
                            alt="Filter Icon"
                            width={100}
                            height={100}
                            className={styles.featureCard__icon}
                        />
                        <h3 className={styles.featureCard__title}>Smart Sorting & Filtering</h3>
                        <p className={styles.featureCard__text}>
                            Find exactly what you're looking for with powerful sorting by name, price, or date, and filter by status
                            or price range.
                        </p>
                    </div>
                </div>
            </section>

            <section className={`${styles.featureSection} ${styles["featureSection--altBackground"]}`}>
                <div className={styles.featureSection__header}>
                    <h2 className={styles.featureSection__title}>Seamless Collaboration & Sharing</h2>
                    <p className={styles.featureSection__description}>
                        Make gift-giving a group effort. Share your wishlists and collaborate with friends and family.
                    </p>
                </div>
                <div className={styles.featureSection__grid}>
                    <div className={styles.featureCard}>
                        <Image
                            src="/placeholder.svg?height=100&width=100"
                            alt="Share Icon"
                            width={100}
                            height={100}
                            className={styles.featureCard__icon}
                        />
                        <h3 className={styles.featureCard__title}>Easy Sharing Options</h3>
                        <p className={styles.featureCard__text}>
                            Share your wishlist link directly or send it via email. Make your list public or keep it private.
                        </p>
                    </div>
                    <div className={styles.featureCard}>
                        <Image
                            src="/placeholder.svg?height=100&width=100"
                            alt="Collaborate Icon"
                            width={100}
                            height={100}
                            className={styles.featureCard__icon}
                        />
                        <h3 className={styles.featureCard__title}>Multi-User Collaboration</h3>
                        <p className={styles.featureCard__text}>
                            Invite collaborators with different roles (owner, editor, viewer) to manage or contribute to your
                            wishlists.
                        </p>
                    </div>
                    <div className={styles.featureCard}>
                        <Image
                            src="/placeholder.svg?height=100&width=100"
                            alt="Privacy Icon"
                            width={100}
                            height={100}
                            className={styles.featureCard__icon}
                        />
                        <h3 className={styles.featureCard__title}>Granular Privacy Controls</h3>
                        <p className={styles.featureCard__text}>
                            Control who sees your wishlists and items. Set individual privacy settings for each list.
                        </p>
                    </div>
                </div>
            </section>

            <section className={styles.featureSection}>
                <div className={styles.featureSection__header}>
                    <h2 className={styles.featureSection__title}>Organize & Personalize</h2>
                    <p className={styles.featureSection__description}>
                        Tailor your wishlists to perfectly match your needs and style.
                    </p>
                </div>
                <div className={styles.featureSection__grid}>
                    <div className={styles.featureCard}>
                        <Image
                            src="/placeholder.svg?height=100&width=100"
                            alt="Tabs Icon"
                            width={100}
                            height={100}
                            className={styles.featureCard__icon}
                        />
                        <h3 className={styles.featureCard__title}>Tabbed Interface</h3>
                        <p className={styles.featureCard__text}>
                            Easily switch between your owned wishlists and those shared with you using a clean tabbed navigation.
                        </p>
                    </div>
                    <div className={styles.featureCard}>
                        <Image
                            src="/placeholder.svg?height=100&width=100"
                            alt="Customization Icon"
                            width={100}
                            height={100}
                            className={styles.featureCard__icon}
                        />
                        <h3 className={styles.featureCard__title}>Customizable Wishlists</h3>
                        <p className={styles.featureCard__text}>
                            Edit wishlist details, add cover images, and categorize your lists for better organization.
                        </p>
                    </div>
                    <div className={styles.featureCard}>
                        <Image
                            src="/placeholder.svg?height=100&width=100"
                            alt="Owner Icon"
                            width={100}
                            height={100}
                            className={styles.featureCard__icon}
                        />
                        <h3 className={styles.featureCard__title}>Clear Ownership Display</h3>
                        <p className={styles.featureCard__text}>
                            Always know who owns a wishlist, whether it's yours or shared by someone else.
                        </p>
                    </div>
                </div>
            </section>

            <section className={styles.featuresCta}>
                <h2 className={styles.featuresCta__title}>Ready to Simplify Your Gifting?</h2>
                <p className={styles.featuresCta__description}>
                    Join Kageo today and transform the way you create, manage, and share your desires.
                </p>
                <Link href="/wishlist" className={styles.featuresCta__button}>
                    Get Started Now
                </Link>
            </section>
        </main>
    )
}
