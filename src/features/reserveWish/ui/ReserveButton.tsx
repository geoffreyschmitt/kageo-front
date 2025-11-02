import styles from "./ReserveButton.module.css"

export const ReserveButton = ({wishId}) =>
    <button
        className={`${styles['reserved-button']}`}
        onClick={() => {
            console.log('reserve wish => ', wishId)
        }}
    >
        Reserve
    </button>