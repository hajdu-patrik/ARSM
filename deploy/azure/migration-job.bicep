// Migration job of the ARSM API: the API image with --migrate-database, connected as the administrator.
// Deployed by main.bicep; deploy-azure.py starts it and waits for success before any app revision changes.

targetScope = 'resourceGroup'

@description('Short lowercase prefix for resource names.')
@maxLength(12)
param namePrefix string

@description('Azure region of the job.')
param location string

@description('Resource id of the Container Apps environment.')
param environmentId string

@description('API image; the job runs it with --migrate-database.')
param apiImage string

@description('Resource id of the user-assigned identity that pulls the image.')
param pullIdentityId string

@description('Registries the image is pulled from, with the pull identity.')
param registries array

@secure()
@description('Administrator connection string (SSL required, small pool).')
param adminConnectionString string

@secure()
@description('Password the job sets on the login role arsm_app.')
param appRolePassword string

@secure()
@description('JWT signing secret; the API host resolves it before the command runs.')
param jwtSecret string

@description('Public https origin; the API host resolves the CORS origin before the command runs.')
param publicUrl string

@description('Blob endpoint of the storage account, resolved eagerly by the API host.')
param blobServiceUrl string

@description('Client id of the user-assigned identity, resolved eagerly by the API host.')
param managedIdentityClientId string

@description('Profile-picture container name.')
param objectStorageContainer string

// Manual trigger, one replica, no retries: a failed migration stops the deploy instead of running twice.
resource migrationJob 'Microsoft.App/jobs@2024-03-01' = {
  name: '${namePrefix}-migrate'
  location: location
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: { '${pullIdentityId}': {} }
  }
  properties: {
    environmentId: environmentId
    configuration: {
      triggerType: 'Manual'
      replicaTimeout: 900
      replicaRetryLimit: 0
      manualTriggerConfig: { parallelism: 1, replicaCompletionCount: 1 }
      registries: registries
      secrets: [
        { name: 'db-admin-connection', value: adminConnectionString }
        { name: 'app-role-password', value: appRolePassword }
        { name: 'jwt-secret', value: jwtSecret }
      ]
    }
    template: {
      containers: [
        {
          name: 'migrate'
          image: apiImage
          args: [ '--migrate-database' ]
          resources: { cpu: json('0.5'), memory: '1Gi' }
          env: [
            { name: 'ASPNETCORE_ENVIRONMENT', value: 'Production' }
            { name: 'ConnectionStrings__AutoServiceDb', secretRef: 'db-admin-connection' }
            { name: 'Database__AppRolePassword', secretRef: 'app-role-password' }
            { name: 'JwtSettings__Secret', secretRef: 'jwt-secret' }
            { name: 'Cors__AllowedOrigins__0', value: publicUrl }
            { name: 'ObjectStorage__Provider', value: 'AzureBlob' }
            { name: 'ObjectStorage__ServiceUrl', value: blobServiceUrl }
            { name: 'ObjectStorage__ManagedIdentityClientId', value: managedIdentityClientId }
            { name: 'ObjectStorage__BucketName', value: objectStorageContainer }
            { name: 'ObjectStorage__AutoCreateBucket', value: 'false' }
          ]
        }
      ]
    }
  }
}

output jobName string = migrationJob.name
