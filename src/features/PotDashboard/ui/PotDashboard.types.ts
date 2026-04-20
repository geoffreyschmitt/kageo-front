export type TPotContributorRow = {
    name: string
    amount: number
}

export type TPotDashboardProps = {
    totalContributed: number
    myContribution: number
    contributors: TPotContributorRow[]
    currency: string
}
