// ASP.NET Core DataProtection key ring of the API: blob container in the existing storage account, Key Vault key
// that wraps it, and the pull identity's data roles on both. Called from main.bicep.

targetScope = 'resourceGroup'

@description('Azure region for every resource.')
param location string

@description('Short lowercase prefix for resource names.')
param namePrefix string

@description('Name of the storage account created by main.bicep.')
param storageAccountName string

@description('Resource id of the user-assigned identity the API runs as.')
param pullIdentityId string

@description('Principal id of that identity.')
param pullIdentityPrincipalId string

var suffix = uniqueString(resourceGroup().id)
var blobDataContributorRoleId = 'ba92f5b4-2d11-453d-a403-e96b0029c9fe'
var keyVaultCryptoServiceEncryptionUserRoleId = 'e147488a-f6f5-4113-8e2d-b22465e65bf6'
var dataProtectionContainerName = 'dataprotection-keys'
var dataProtectionKeyName = 'dataprotection'

resource storage 'Microsoft.Storage/storageAccounts@2023-05-01' existing = {
  name: storageAccountName
}

resource blobService 'Microsoft.Storage/storageAccounts/blobServices@2023-05-01' existing = {
  parent: storage
  name: 'default'
}

// The keys.xml blob of the key ring lives in this container.
resource dataProtectionContainer 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-05-01' = {
  parent: blobService
  name: dataProtectionContainerName
  properties: { publicAccess: 'None' }
}

resource dataProtectionBlobAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  scope: dataProtectionContainer
  name: guid(dataProtectionContainer.id, pullIdentityId, blobDataContributorRoleId)
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', blobDataContributorRoleId)
    principalId: pullIdentityPrincipalId
    principalType: 'ServicePrincipal'
  }
}

// Wraps the key ring. Public network access stays on (Consumption apps have no fixed outbound address);
// purge protection stays off because it cannot be undone.
resource keyVault 'Microsoft.KeyVault/vaults@2023-07-01' = {
  name: take(toLower('${namePrefix}kv${suffix}'), 24)
  location: location
  properties: {
    tenantId: tenant().tenantId
    sku: { family: 'A', name: 'standard' }
    enableRbacAuthorization: true
  }
}

resource dataProtectionKey 'Microsoft.KeyVault/vaults/keys@2023-07-01' = {
  parent: keyVault
  name: dataProtectionKeyName
  properties: {
    kty: 'RSA'
    keySize: 2048
    keyOps: [ 'wrapKey', 'unwrapKey' ]
  }
}

// Least privilege: wrap and unwrap with this one key, nothing else in the vault.
resource dataProtectionKeyAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  scope: dataProtectionKey
  name: guid(dataProtectionKey.id, pullIdentityId, keyVaultCryptoServiceEncryptionUserRoleId)
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', keyVaultCryptoServiceEncryptionUserRoleId)
    principalId: pullIdentityPrincipalId
    principalType: 'ServicePrincipal'
  }
}

@description('Versionless identifier of the key that wraps the key ring (DataProtection__KeyVaultKeyUri).')
output keyVaultKeyUri string = dataProtectionKey.properties.keyUri

@description('URL of the key-ring blob (DataProtection__BlobUri).')
output blobUri string = '${storage.properties.primaryEndpoints.blob}${dataProtectionContainerName}/keys.xml'
