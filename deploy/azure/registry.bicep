// Azure Container Registry (Basic) for the ARSM images; pulls use a managed identity, so the admin user stays off.
// Deployed by `deploy-azure.py registry` before the images are pushed and before main.bicep.

targetScope = 'resourceGroup'

@description('Azure region for the registry.')
param location string = resourceGroup().location

@description('Globally unique registry name, 5-50 lowercase letters and digits.')
@minLength(5)
@maxLength(50)
param acrName string

resource registry 'Microsoft.ContainerRegistry/registries@2023-07-01' = {
  name: acrName
  location: location
  sku: { name: 'Basic' }
  properties: {
    adminUserEnabled: false
  }
}

output loginServer string = registry.properties.loginServer
