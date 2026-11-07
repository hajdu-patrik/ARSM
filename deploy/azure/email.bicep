// Transactional mail: Email Communication Services with the sender's own domain, the Communication Services
// resource the API calls, and a send-only custom role for the API's pull identity (no key, no secret).

@description('Short lowercase prefix for resource names.')
param namePrefix string

@description('Sender of the transactional e-mails: an address or Display Name <address>.')
param mailFrom string

@description('Principal id of the user-assigned identity the API runs as.')
param senderPrincipalId string

@description('Link the domain to the Communication Services resource; only valid once its DNS records are verified.')
param linkDomain bool = false

var hasDisplayName = contains(mailFrom, '<')
var senderAddress = hasDisplayName ? trim(replace(substring(mailFrom, indexOf(mailFrom, '<') + 1), '>', '')) : trim(mailFrom)
var senderDisplayName = hasDisplayName ? trim(substring(mailFrom, 0, indexOf(mailFrom, '<'))) : split(senderAddress, '@')[0]
var senderLocalPart = split(senderAddress, '@')[0]
var senderDomain = split(senderAddress, '@')[1]

resource emailService 'Microsoft.Communication/emailServices@2023-04-01' = {
  name: '${namePrefix}-email'
  location: 'global'
  properties: {
    dataLocation: 'Europe'
  }
}

resource domain 'Microsoft.Communication/emailServices/domains@2023-04-01' = {
  parent: emailService
  name: senderDomain
  location: 'global'
  properties: {
    domainManagement: 'CustomerManaged'
    userEngagementTracking: 'Disabled'
  }
}

resource senderUsername 'Microsoft.Communication/emailServices/domains/senderUsernames@2023-04-01' = {
  parent: domain
  name: senderLocalPart
  properties: {
    username: senderLocalPart
    displayName: senderDisplayName
  }
}

resource communication 'Microsoft.Communication/communicationServices@2023-04-01' = {
  name: '${namePrefix}-communication'
  location: 'global'
  properties: {
    dataLocation: 'Europe'
    linkedDomains: linkDomain ? [ domain.id ] : []
  }
}

// The three actions Microsoft documents for sending with Entra ID; the built-in owner role would also list keys.
resource sendRole 'Microsoft.Authorization/roleDefinitions@2022-04-01' = {
  name: guid(resourceGroup().id, 'arsm-email-sender')
  properties: {
    roleName: 'ARSM Email Sender (${resourceGroup().name})'
    description: 'Sends e-mail through the ARSM Communication Services resource.'
    type: 'CustomRole'
    permissions: [
      {
        actions: [
          'Microsoft.Communication/CommunicationServices/Read'
          'Microsoft.Communication/CommunicationServices/Write'
          'Microsoft.Communication/EmailServices/write'
        ]
      }
    ]
    assignableScopes: [ resourceGroup().id ]
  }
}

resource sendAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  scope: communication
  name: guid(communication.id, senderPrincipalId, sendRole.id)
  properties: {
    roleDefinitionId: sendRole.id
    principalId: senderPrincipalId
    principalType: 'ServicePrincipal'
  }
}

@description('Endpoint the API sends to; empty until the domain is linked, so the API keeps its no-op sender.')
output endpoint string = linkDomain ? 'https://${communication.properties.hostName}' : ''

@description('Plain sender address the API puts in From.')
output senderAddress string = senderAddress

@description('DNS records the sender domain needs (Domain TXT, SPF, DKIM, DKIM2) before verification.')
output verificationRecords object = domain.properties.verificationRecords
