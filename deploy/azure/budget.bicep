// Optional monthly budget of the ARSM resource group, mailed at 50, 80 and 100 percent; a module of its own, because some
// offers (Azure for Students) do not support budgets and the alert rules must not fail with it. Walkthrough: deploy/docs/deployment-azure.md.

targetScope = 'resourceGroup'

@description('Short lowercase prefix for resource names.')
@maxLength(12)
param namePrefix string

@description('Address that receives the budget e-mails.')
param alertEmail string

@description('Monthly budget of the resource group in the subscription currency (above 0); e-mails go out at 50, 80 and 100 percent.')
param monthlyBudgetAmount int

@description('First day of the current month, as the budgets API wants it for a monthly budget; set at deployment time.')
param budgetStartDate string = utcNow('yyyy-MM-01')

var budgetThresholdPercents = [ 50, 80, 100 ]

resource monthlyBudget 'Microsoft.Consumption/budgets@2023-05-01' = {
  name: '${namePrefix}-monthly-budget'
  properties: {
    category: 'Cost'
    timeGrain: 'Monthly'
    amount: monthlyBudgetAmount
    timePeriod: { startDate: budgetStartDate }
    notifications: toObject(budgetThresholdPercents, percent => 'actual${percent}', percent => {
      enabled: true
      operator: 'GreaterThanOrEqualTo'
      threshold: percent
      thresholdType: 'Actual'
      contactEmails: [ alertEmail ]
    })
  }
}
