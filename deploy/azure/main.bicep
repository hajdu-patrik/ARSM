// ARSM on Azure Container Apps: web app (token gate + Nginx, public ingress), internal API app, PostgreSQL
// Flexible Server, Blob Storage, images from ACR. Walkthrough: deploy/docs/deployment-azure.md.

targetScope = 'resourceGroup'

@description('Azure region for every resource.')
param location string = resourceGroup().location

@description('Short lowercase prefix for resource names.')
@maxLength(12)
param namePrefix string = 'arsm'

@description('Name of the Azure Container Registry created by registry.bicep (same resource group).')
param acrName string

@description('API image, e.g. <acr>.azurecr.io/arsm-api:<tag>.')
param apiImage string

@description('Web image built with PUBLIC_URL equal to publicUrl, e.g. <acr>.azurecr.io/arsm-web:<tag>.')
param webImage string

@description('Token gate image, e.g. <acr>.azurecr.io/arsm-gate:<tag>.')
param gateImage string

@description('Public https origin of the app, no trailing slash. Empty: the default Container Apps URL of the web app.')
param publicUrl string = ''

@description('PostgreSQL major version offered by Flexible Server in the region.')
param postgresVersion string = '17'

@description('PostgreSQL administrator login.')
param postgresAdminLogin string = 'arsmadmin'

@secure()
@description('PostgreSQL administrator password.')
param postgresAdminPassword string

@secure()
@description('Password of the DML-only login role arsm_app the API connects as; the migration job sets it.')
param postgresAppPassword string

@secure()
@description('JWT signing secret, at least 32 bytes, no template markers.')
param jwtSecret string

@secure()
@description('Resend sending key.')
param resendApiKey string

@description('Sender of the transactional e-mails: display name and address.')
param mailFrom string

@description('Reply-to address of the transactional e-mails.')
param mailReplyTo string

@description('Private blob container for profile pictures (created here).')
param objectStorageContainer string = 'arsm-profile-pictures'

@description('Company data printed on the quote PDF letterhead.')
param companyName string
param companyAddressLine string
param companyPostalCode string
param companyCity string
param companyTaxNumber string
param companyPhoneNumber string
param companyEmail string

@description('Bootstrap administrator created on the first start of an empty database.')
param bootstrapAdminEmail string
param bootstrapAdminFirstName string
param bootstrapAdminLastName string
param bootstrapAdminMiddleName string = ''
param bootstrapAdminPhoneNumber string = ''

@description('SpecializationType enum name of the bootstrap administrator.')
param bootstrapAdminSpecialization string

@description('ExpertiseType enum names of the bootstrap administrator (1..10 unique).')
param bootstrapAdminExpertise array

@secure()
@description('Password of the bootstrap administrator.')
param bootstrapAdminPassword string

@secure()
@description('Access token of the web gate, at least 32 characters.')
param gateToken string

@description('Keep one API replica running (default); false lets it scale to zero (cold start of roughly 10-20 s). Never more than one replica.')
param apiAlwaysOn bool = true

@description('Keep one web (gate + Nginx) replica running; false (default) scales it to zero when idle, a cold start of about 2 s.')
param webAlwaysOn bool = false

@description('Managed certificate already issued for the publicUrl host (bind-domain); empty before the first bind.')
param customDomainCertificateName string = ''

@minValue(1)
@description('Daily ingestion cap of the Log Analytics workspace in GB; at the cap collection pauses until the daily reset.')
param logAnalyticsDailyQuotaGb int = 1

@description('Address for the alert and budget e-mails; empty creates no action group, alert rule or budget.')
param alertEmail string = ''

@minValue(0)
@description('Monthly budget of the resource group in the subscription currency, mailed at 50, 80 and 100 percent; 0 (default) creates none, because Azure for Students does not support budgets.')
param monthlyBudgetAmount int = 0

@description('false leaves out both Container Apps and what depends on them, so the running revisions stay (deploy-azure.py phase 1).')
param deployApps bool = true

var suffix = uniqueString(resourceGroup().id)
var apiAppName = '${namePrefix}-api'
var webAppName = '${namePrefix}-web'
// Nginx's resolver ignores resolv.conf search domains, so it needs the documented internal FQDN.
var apiInternalHost = '${apiAppName}.internal.${containerEnv.properties.defaultDomain}'
var effectivePublicUrl = empty(publicUrl) ? 'https://${webAppName}.${containerEnv.properties.defaultDomain}' : publicUrl
var acrPullRoleId = '7f951dda-4ed3-4680-a7ca-43fe172d538d'
var blobDataContributorRoleId = 'ba92f5b4-2d11-453d-a403-e96b0029c9fe'
var apiMinReplicas = apiAlwaysOn ? 1 : 0
var webMinReplicas = webAlwaysOn ? 1 : 0
var pullIdentities = { '${pullIdentity.id}': {} }
var registries = [
  {
    server: acr.properties.loginServer
    identity: pullIdentity.id
  }
]
var bootstrapOptionalEnv = concat(
  empty(bootstrapAdminMiddleName) ? [] : [ { name: 'Bootstrap__Admin__MiddleName', value: bootstrapAdminMiddleName } ],
  empty(bootstrapAdminPhoneNumber) ? [] : [ { name: 'Bootstrap__Admin__PhoneNumber', value: bootstrapAdminPhoneNumber } ]
)
var bootstrapExpertiseEnv = [for (expertise, i) in bootstrapAdminExpertise: {
  name: 'Bootstrap__Admin__Expertise__${i}'
  value: string(expertise)
}]

// Registry created by registry.bicep; both apps pull from it with the managed identity below.
resource acr 'Microsoft.ContainerRegistry/registries@2023-07-01' existing = {
  name: acrName
}

resource pullIdentity 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-01-31' = {
  name: '${namePrefix}-pull-id'
  location: location
}

resource acrPullAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  scope: acr
  name: guid(acr.id, pullIdentity.id, acrPullRoleId)
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', acrPullRoleId)
    principalId: pullIdentity.properties.principalId
    principalType: 'ServicePrincipal'
  }
}

resource logs 'Microsoft.OperationalInsights/workspaces@2023-09-01' = {
  name: '${namePrefix}-logs-${suffix}'
  location: location
  properties: {
    sku: { name: 'PerGB2018' }
    retentionInDays: 30
    workspaceCapping: { dailyQuotaGb: logAnalyticsDailyQuotaGb }
  }
}

resource containerEnv 'Microsoft.App/managedEnvironments@2026-07-01' = {
  name: '${namePrefix}-env'
  location: location
  properties: {
    // Without an explicit mode Azure creates an Express environment: no static IP, custom domain or allowInsecure.
    environmentMode: 'WorkloadProfiles'
    workloadProfiles: [ { name: 'Consumption', workloadProfileType: 'Consumption' } ]
    appLogsConfiguration: {
      destination: 'log-analytics'
      logAnalyticsConfiguration: {
        customerId: logs.properties.customerId
        sharedKey: logs.listKeys().primarySharedKey
      }
    }
  }
}

resource postgres 'Microsoft.DBforPostgreSQL/flexibleServers@2024-08-01' = {
  name: '${namePrefix}-pg-${suffix}'
  location: location
  sku: { name: 'Standard_B1ms', tier: 'Burstable' }
  properties: {
    version: postgresVersion
    administratorLogin: postgresAdminLogin
    administratorLoginPassword: postgresAdminPassword
    storage: { storageSizeGB: 32 }
    backup: { backupRetentionDays: 7, geoRedundantBackup: 'Disabled' }
    highAvailability: { mode: 'Disabled' }
    network: { publicNetworkAccess: 'Enabled' }
  }
}

// The migrations create the pg_trgm extension (customer search); Flexible Server only allows
// extensions that are listed here.
resource postgresExtensions 'Microsoft.DBforPostgreSQL/flexibleServers/configurations@2024-08-01' = {
  parent: postgres
  name: 'azure.extensions'
  properties: {
    value: 'PG_TRGM'
    source: 'user-override'
  }
}

// Consumption Container Apps have no fixed outbound address; this rule admits Azure services only.
resource postgresAzureAccess 'Microsoft.DBforPostgreSQL/flexibleServers/firewallRules@2024-08-01' = {
  parent: postgres
  name: 'AllowAzureServices'
  properties: {
    startIpAddress: '0.0.0.0'
    endIpAddress: '0.0.0.0'
  }
}

// Profile pictures: Azure Blob Storage (5 GB LRS is on the student free list), private container, HTTPS only.
resource storage 'Microsoft.Storage/storageAccounts@2023-05-01' = {
  name: take(toLower('${namePrefix}st${suffix}'), 24)
  location: location
  sku: { name: 'Standard_LRS' }
  kind: 'StorageV2'
  properties: {
    minimumTlsVersion: 'TLS1_2'
    supportsHttpsTrafficOnly: true
    allowBlobPublicAccess: false
  }
}

resource blobService 'Microsoft.Storage/storageAccounts/blobServices@2023-05-01' = {
  parent: storage
  name: 'default'
}

resource pictureContainer 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-05-01' = {
  parent: blobService
  name: objectStorageContainer
  properties: { publicAccess: 'None' }
}

// The API reaches the container as the pull identity: data role on this container only, no account key.
resource blobDataAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  scope: pictureContainer
  name: guid(pictureContainer.id, pullIdentity.id, blobDataContributorRoleId)
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', blobDataContributorRoleId)
    principalId: pullIdentity.properties.principalId
    principalType: 'ServicePrincipal'
  }
}

resource database 'Microsoft.DBforPostgreSQL/flexibleServers/databases@2024-08-01' = {
  parent: postgres
  name: 'AutoServiceDb'
  properties: {
    charset: 'UTF8'
    collation: 'en_US.utf8'
  }
}

// Runs --migrate-database as the administrator; deploy-azure.py starts it and waits before any app revision changes.
module migrationJob 'migration-job.bicep' = {
  name: '${namePrefix}-migration-job'
  dependsOn: [ database, postgresExtensions, postgresAzureAccess, acrPullAssignment ]
  params: {
    namePrefix: namePrefix
    location: location
    environmentId: containerEnv.id
    apiImage: apiImage
    pullIdentityId: pullIdentity.id
    registries: registries
    adminConnectionString: 'Host=${postgres.properties.fullyQualifiedDomainName};Port=5432;Database=AutoServiceDb;Username=${postgresAdminLogin};Password=${postgresAdminPassword};SSL Mode=Require;Maximum Pool Size=5'
    appRolePassword: postgresAppPassword
    jwtSecret: jwtSecret
    publicUrl: effectivePublicUrl
    blobServiceUrl: storage.properties.primaryEndpoints.blob
    managedIdentityClientId: pullIdentity.properties.clientId
    objectStorageContainer: objectStorageContainer
  }
}

// The API is reached only through the web app's Nginx at http://<apiInternalHost>; the platform routes
// by host name, so AllowedHosts admits it and the <apiAppName> Host header the probes send.
resource apiApp 'Microsoft.App/containerApps@2024-03-01' = if (deployApps) {
  name: apiAppName
  location: location
  dependsOn: [ database, postgresExtensions, postgresAzureAccess, pictureContainer, acrPullAssignment, blobDataAssignment ]
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: pullIdentities
  }
  properties: {
    managedEnvironmentId: containerEnv.id
    configuration: {
      activeRevisionsMode: 'Single'
      ingress: {
        external: false
        targetPort: 8080
        transport: 'http'
        allowInsecure: true
      }
      registries: registries
      secrets: [
        {
          name: 'db-connection'
          // DML-only role provisioned by the migration job. Npgsql's default pool of 100 would exceed what
          // a B1ms server accepts (about 35 user connections).
          value: 'Host=${postgres.properties.fullyQualifiedDomainName};Port=5432;Database=AutoServiceDb;Username=arsm_app;Password=${postgresAppPassword};SSL Mode=Require;Maximum Pool Size=20'
        }
        { name: 'jwt-secret', value: jwtSecret }
        { name: 'bootstrap-admin-password', value: bootstrapAdminPassword }
        { name: 'resend-api-key', value: resendApiKey }
      ]
    }
    template: {
      containers: [
        {
          name: 'api'
          image: apiImage
          resources: { cpu: json('0.5'), memory: '1Gi' }
          env: concat([
            { name: 'ASPNETCORE_ENVIRONMENT', value: 'Production' }
            { name: 'Database__MigrateOnStartup', value: 'false' }
            { name: 'AllowedHosts', value: '${apiAppName};${apiInternalHost}' }
            { name: 'Cors__AllowedOrigins__0', value: effectivePublicUrl }
            // Nginx overwrites X-Forwarded-For with the resolved client address, and the platform
            // ingress in front of the API appends Nginx's address: two private hops, no public one.
            { name: 'ForwardedHeaders__ForwardLimit', value: '2' }
            { name: 'ForwardedHeaders__KnownNetworks__0', value: '10.0.0.0/8' }
            { name: 'ForwardedHeaders__KnownNetworks__1', value: '172.16.0.0/12' }
            { name: 'ForwardedHeaders__KnownNetworks__2', value: '192.168.0.0/16' }
            { name: 'ForwardedHeaders__KnownNetworks__3', value: '100.64.0.0/10' }
            { name: 'Deployment__RateLimiterTopology', value: 'SingleInstance' }
            { name: 'ConnectionStrings__AutoServiceDb', secretRef: 'db-connection' }
            { name: 'JwtSettings__Secret', secretRef: 'jwt-secret' }
            { name: 'ObjectStorage__Provider', value: 'AzureBlob' }
            { name: 'ObjectStorage__ServiceUrl', value: storage.properties.primaryEndpoints.blob }
            { name: 'ObjectStorage__ManagedIdentityClientId', value: pullIdentity.properties.clientId }
            { name: 'ObjectStorage__BucketName', value: objectStorageContainer }
            { name: 'ObjectStorage__AutoCreateBucket', value: 'false' }
            { name: 'CompanyProfile__Name', value: companyName }
            { name: 'CompanyProfile__AddressLine', value: companyAddressLine }
            { name: 'CompanyProfile__PostalCode', value: companyPostalCode }
            { name: 'CompanyProfile__City', value: companyCity }
            { name: 'CompanyProfile__TaxNumber', value: companyTaxNumber }
            { name: 'CompanyProfile__PhoneNumber', value: companyPhoneNumber }
            { name: 'CompanyProfile__Email', value: companyEmail }
            { name: 'Email__ResendApiKey', secretRef: 'resend-api-key' }
            { name: 'Email__From', value: mailFrom }
            { name: 'Email__ReplyTo', value: mailReplyTo }
            { name: 'Email__PublicUrl', value: effectivePublicUrl }
            { name: 'Bootstrap__Admin__Email', value: bootstrapAdminEmail }
            { name: 'Bootstrap__Admin__FirstName', value: bootstrapAdminFirstName }
            { name: 'Bootstrap__Admin__LastName', value: bootstrapAdminLastName }
            { name: 'Bootstrap__Admin__Specialization', value: bootstrapAdminSpecialization }
            { name: 'Bootstrap__Admin__Password', secretRef: 'bootstrap-admin-password' }
          ], bootstrapOptionalEnv, bootstrapExpertiseEnv)
          probes: [
            {
              type: 'Liveness'
              httpGet: {
                path: '/alive'
                port: 8080
                httpHeaders: [ { name: 'Host', value: apiAppName } ]
              }
              initialDelaySeconds: 20
              periodSeconds: 30
            }
            {
              type: 'Readiness'
              httpGet: {
                path: '/alive'
                port: 8080
                httpHeaders: [ { name: 'Host', value: apiAppName } ]
              }
              periodSeconds: 10
            }
          ]
        }
      ]
      // Login rate limits and bans are process-local: never more than one replica.
      scale: { minReplicas: apiMinReplicas, maxReplicas: 1 }
    }
  }
}

// Two containers share one network namespace: the gate is the ingress target on 8080 and forwards to
// Nginx on 127.0.0.1:18080. Only TCP probes on the gate, an HTTP probe would get the lock page.
resource webApp 'Microsoft.App/containerApps@2024-03-01' = if (deployApps) {
  name: webAppName
  location: location
  dependsOn: [ acrPullAssignment ]
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: pullIdentities
  }
  properties: {
    managedEnvironmentId: containerEnv.id
    configuration: {
      activeRevisionsMode: 'Single'
      ingress: {
        external: true
        targetPort: 8080
        transport: 'auto'
        allowInsecure: false
        // Redeploying without this would drop the custom domain that bind-domain added.
        customDomains: empty(customDomainCertificateName) || empty(publicUrl) ? [] : [
          {
            name: replace(publicUrl, 'https://', '')
            certificateId: '${containerEnv.id}/managedCertificates/${customDomainCertificateName}'
            bindingType: 'SniEnabled'
          }
        ]
      }
      registries: registries
      secrets: [
        { name: 'gate-token', value: gateToken }
      ]
    }
    template: {
      containers: [
        {
          name: 'gate'
          image: gateImage
          resources: { cpu: json('0.25'), memory: '0.5Gi' }
          env: [
            { name: 'GATE_MODE', value: 'azure' }
            { name: 'GATE_HOST', value: '0.0.0.0' }
            { name: 'GATE_PORT', value: '8080' }
            { name: 'UPSTREAM_PORT', value: '18080' }
            { name: 'GATE_TOKEN', secretRef: 'gate-token' }
          ]
          probes: [
            {
              type: 'Liveness'
              tcpSocket: { port: 8080 }
              initialDelaySeconds: 10
              periodSeconds: 30
            }
            {
              type: 'Readiness'
              tcpSocket: { port: 8080 }
              periodSeconds: 10
            }
          ]
        }
        {
          name: 'web'
          image: webImage
          resources: { cpu: json('0.25'), memory: '0.5Gi' }
          env: [
            { name: 'PORT', value: '18080' }
            { name: 'API_UPSTREAM', value: 'http://${apiInternalHost}' }
          ]
        }
      ]
      scale: { minReplicas: webMinReplicas, maxReplicas: 1 }
    }
  }
}

// Action group and alert rules; created only when an alert e-mail is set and the apps are deployed.
module guardRails 'guardrails.bicep' = if (deployApps && !empty(alertEmail)) {
  name: '${namePrefix}-guardrails'
  params: {
    namePrefix: namePrefix
    alertEmail: alertEmail
    apiAppId: apiApp.id
  }
}

// Monthly budget in a module of its own, so an offer without budget support cannot take the alert rules down.
module budget 'budget.bicep' = if (!empty(alertEmail) && monthlyBudgetAmount > 0) {
  name: '${namePrefix}-budget'
  params: {
    namePrefix: namePrefix
    alertEmail: alertEmail
    monthlyBudgetAmount: monthlyBudgetAmount
  }
}

@description('Public https origin; the web image must be built with exactly this PUBLIC_URL.')
output publicUrl string = effectivePublicUrl

@description('Default Container Apps host name of the web app (CNAME target for a custom domain).')
output webDefaultHost string = deployApps ? webApp.properties.configuration.ingress.fqdn : ''

@description('Static inbound IP of the Container Apps environment (A record of the apex domain).')
output environmentStaticIp string = containerEnv.properties.staticIp

@description('Value of the asuid TXT record that proves ownership of the custom domain.')
output customDomainVerificationId string = deployApps ? webApp.properties.customDomainVerificationId : ''

output postgresHost string = postgres.properties.fullyQualifiedDomainName
