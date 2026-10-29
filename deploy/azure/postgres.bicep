// PostgreSQL Flexible Server of ARSM with its extension allow-list, Azure-services firewall rule and the
// AutoServiceDb database. Called from main.bicep.

targetScope = 'resourceGroup'

@description('Azure region for every resource.')
param location string

@description('Short lowercase prefix for resource names.')
param namePrefix string

@description('PostgreSQL major version offered by Flexible Server in the region.')
param postgresVersion string

@description('PostgreSQL administrator login.')
param postgresAdminLogin string

@secure()
@description('PostgreSQL administrator password.')
param postgresAdminPassword string

var suffix = uniqueString(resourceGroup().id)

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
  // The server takes one write at a time, so its child resources go in a chain (parallel writes fail with ServerIsBusy).
  dependsOn: [ postgresExtensions ]
  properties: {
    startIpAddress: '0.0.0.0'
    endIpAddress: '0.0.0.0'
  }
}

resource database 'Microsoft.DBforPostgreSQL/flexibleServers/databases@2024-08-01' = {
  parent: postgres
  name: 'AutoServiceDb'
  dependsOn: [ postgresAzureAccess ]
  properties: {
    charset: 'UTF8'
    collation: 'en_US.utf8'
  }
}

@description('Host name of the server.')
output fullyQualifiedDomainName string = postgres.properties.fullyQualifiedDomainName
