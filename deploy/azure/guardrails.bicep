// Cost and health guard rails of the ARSM API: a monthly budget and two alert rules, all mailed to one address.
// Deployed by main.bicep only when an alert e-mail is set. Walkthrough: deploy/docs/deployment-azure.md.

targetScope = 'resourceGroup'

@description('Short lowercase prefix for resource names.')
@maxLength(12)
param namePrefix string

@description('Address that receives the budget and alert e-mails.')
param alertEmail string

@description('Resource id of the API container app the alert rules watch.')
param apiAppId string

@minValue(1)
@description('Monthly budget of the resource group in the subscription currency; e-mails go out at 50, 80 and 100 percent.')
param monthlyBudgetAmount int

@description('First day of the current month, as the budgets API wants it for a monthly budget; set at deployment time.')
param budgetStartDate string = utcNow('yyyy-MM-01')

var budgetThresholdPercents = [ 50, 80, 100 ]

resource alertActionGroup 'Microsoft.Insights/actionGroups@2023-01-01' = {
  name: '${namePrefix}-alerts'
  location: 'global'
  properties: {
    groupShortName: namePrefix
    enabled: true
    emailReceivers: [
      {
        name: 'owner'
        emailAddress: alertEmail
        useCommonAlertSchema: true
      }
    ]
  }
}

resource apiErrorAlert 'Microsoft.Insights/metricAlerts@2018-03-01' = {
  name: '${namePrefix}-api-5xx'
  location: 'global'
  properties: {
    description: 'More than 5 responses with a 5xx status from the API within 5 minutes.'
    severity: 2
    enabled: true
    scopes: [ apiAppId ]
    evaluationFrequency: 'PT5M'
    windowSize: 'PT5M'
    criteria: {
      'odata.type': 'Microsoft.Azure.Monitor.SingleResourceMultipleMetricCriteria'
      allOf: [
        {
          criterionType: 'StaticThresholdCriterion'
          name: 'ServerErrors'
          metricName: 'Requests'
          dimensions: [ { name: 'statusCodeCategory', operator: 'Include', values: [ '5xx' ] } ]
          operator: 'GreaterThan'
          threshold: 5
          timeAggregation: 'Total'
        }
      ]
    }
    actions: [ { actionGroupId: alertActionGroup.id } ]
  }
}

// RestartCount is cumulative per replica, so this rule stays fired until the replica is replaced.
resource apiRestartAlert 'Microsoft.Insights/metricAlerts@2018-03-01' = {
  name: '${namePrefix}-api-restarts'
  location: 'global'
  properties: {
    description: 'The API container restarted within the last 15 minutes.'
    severity: 2
    enabled: true
    scopes: [ apiAppId ]
    evaluationFrequency: 'PT5M'
    windowSize: 'PT15M'
    criteria: {
      'odata.type': 'Microsoft.Azure.Monitor.SingleResourceMultipleMetricCriteria'
      allOf: [
        {
          criterionType: 'StaticThresholdCriterion'
          name: 'Restarts'
          metricName: 'RestartCount'
          operator: 'GreaterThan'
          threshold: 0
          timeAggregation: 'Total'
        }
      ]
    }
    actions: [ { actionGroupId: alertActionGroup.id } ]
  }
}

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
