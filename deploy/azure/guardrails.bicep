// Health guard rails of the ARSM API: an action group, two metric alert rules and two log alert rules, mailed to
// one address. Deployed by main.bicep only when an alert e-mail is set; the optional budget is budget.bicep.

targetScope = 'resourceGroup'

@description('Short lowercase prefix for resource names.')
@maxLength(12)
param namePrefix string

@description('Address that receives the alert e-mails.')
param alertEmail string

@description('Resource id of the API container app the alert rules watch.')
param apiAppId string

@description('Name of the API container app, as ContainerAppName_s in the console log table.')
param apiAppName string

@description('Resource id of the Log Analytics workspace the log alert rules query.')
param workspaceId string

@description('Region of the Log Analytics workspace; a log alert rule lives in the region of its scope.')
param workspaceLocation string

// ASP.NET's simple console formatter writes the level as a line prefix (fail, crit, warn); the message
// itself follows on the next row. The container name 'api' is the one container of the API app.
var apiConsoleLogs = 'ContainerAppConsoleLogs_CL | where ContainerAppName_s == "${apiAppName}" and ContainerName_s == "api"'
var summaryColumns = '| sort by TimeGenerated asc | summarize LineCount = count(), Lines = make_list(Log_s, 3) | extend Sample = substring(strcat_array(Lines, " | "), 0, 500) | project LineCount, Sample'
var errorQuery = '${apiConsoleLogs} | where Log_s startswith "fail:" or Log_s startswith "crit:" ${summaryColumns}'
var warningQuery = '${apiConsoleLogs} | where Log_s startswith "warn:" ${summaryColumns}'

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

// Both log rules are stateless (autoMitigate false) and summarize to one row per evaluation, so each 5-minute
// window with matching lines fires one alert and one mail (count, first three lines) and nothing resolves.
resource apiLogErrorAlert 'Microsoft.Insights/scheduledQueryRules@2023-12-01' = {
  name: '${namePrefix}-api-errors'
  location: workspaceLocation
  kind: 'LogAlert'
  properties: {
    displayName: '${namePrefix}-api-errors'
    description: 'ERROR: the API logged at Error or Critical level (fail:/crit: console lines) within 5 minutes.'
    severity: 1
    enabled: true
    scopes: [ workspaceId ]
    evaluationFrequency: 'PT5M'
    windowSize: 'PT5M'
    autoMitigate: false
    // Both rules: ContainerAppConsoleLogs_CL exists only after the first ingestion, so creation skips the query check.
    skipQueryValidation: true
    criteria: {
      allOf: [
        {
          query: errorQuery
          timeAggregation: 'Total'
          metricMeasureColumn: 'LineCount'
          dimensions: [ { name: 'Sample', operator: 'Include', values: [ '*' ] } ]
          operator: 'GreaterThan'
          threshold: 0
          failingPeriods: { numberOfEvaluationPeriods: 1, minFailingPeriodsToAlert: 1 }
        }
      ]
    }
    actions: { actionGroups: [ alertActionGroup.id ] }
  }
}

resource apiLogWarningAlert 'Microsoft.Insights/scheduledQueryRules@2023-12-01' = {
  name: '${namePrefix}-api-warnings'
  location: workspaceLocation
  kind: 'LogAlert'
  properties: {
    displayName: '${namePrefix}-api-warnings'
    description: 'WARNING: the API logged at Warning level (warn: console lines) within 5 minutes.'
    severity: 3
    enabled: true
    scopes: [ workspaceId ]
    evaluationFrequency: 'PT5M'
    windowSize: 'PT5M'
    autoMitigate: false
    skipQueryValidation: true
    criteria: {
      allOf: [
        {
          query: warningQuery
          timeAggregation: 'Total'
          metricMeasureColumn: 'LineCount'
          dimensions: [ { name: 'Sample', operator: 'Include', values: [ '*' ] } ]
          operator: 'GreaterThan'
          threshold: 0
          failingPeriods: { numberOfEvaluationPeriods: 1, minFailingPeriodsToAlert: 1 }
        }
      ]
    }
    actions: { actionGroups: [ alertActionGroup.id ] }
  }
}
