// Deployment parameters for deploy/azure/main.bicep; deploy-azure.py exports every value as an environment
// variable of the az process (see deploy/docs/deployment-azure.md for the list) - no real secrets here.
using './main.bicep'

param acrName = readEnvironmentVariable('ARSM_ACR_NAME')
param apiImage = readEnvironmentVariable('ARSM_API_IMAGE')
param webImage = readEnvironmentVariable('ARSM_WEB_IMAGE')
param gateImage = readEnvironmentVariable('ARSM_GATE_IMAGE')
param publicUrl = readEnvironmentVariable('ARSM_PUBLIC_URL')
param apiAlwaysOn = bool(readEnvironmentVariable('ARSM_API_ALWAYS_ON', 'true'))
param webAlwaysOn = bool(readEnvironmentVariable('ARSM_WEB_ALWAYS_ON', 'false'))
param customDomainCertificateName = readEnvironmentVariable('ARSM_CUSTOM_DOMAIN_CERT', '')

param alertEmail = readEnvironmentVariable('ARSM_ALERT_EMAIL', '')
param monthlyBudgetAmount = int(readEnvironmentVariable('ARSM_MONTHLY_BUDGET', '0'))
param logAnalyticsDailyQuotaGb = int(readEnvironmentVariable('ARSM_LOG_DAILY_QUOTA_GB', '1'))

param postgresAdminPassword = readEnvironmentVariable('ARSM_POSTGRES_PASSWORD')
param jwtSecret = readEnvironmentVariable('ARSM_JWT_SECRET')
param gateToken = readEnvironmentVariable('ARSM_PROD_GATE_TOKEN')

param objectStorageContainer = readEnvironmentVariable('ARSM_BLOB_CONTAINER', 'arsm-profile-pictures')

param bootstrapAdminEmail = readEnvironmentVariable('ARSM_PROD_ADMIN_EMAIL')
param bootstrapAdminPassword = readEnvironmentVariable('ARSM_PROD_ADMIN_PASSWORD')
param bootstrapAdminFirstName = readEnvironmentVariable('ARSM_PROD_ADMIN_FIRST_NAME')
param bootstrapAdminLastName = readEnvironmentVariable('ARSM_PROD_ADMIN_LAST_NAME')
param bootstrapAdminMiddleName = readEnvironmentVariable('ARSM_PROD_ADMIN_MIDDLE_NAME', '')
param bootstrapAdminPhoneNumber = readEnvironmentVariable('ARSM_PROD_ADMIN_PHONE', '')
param bootstrapAdminSpecialization = readEnvironmentVariable('ARSM_PROD_ADMIN_SPECIALIZATION')
param bootstrapAdminExpertise = map(split(readEnvironmentVariable('ARSM_PROD_ADMIN_EXPERTISE'), ','), item => trim(item))

param companyName = readEnvironmentVariable('ARSM_COMPANY_NAME')
param companyAddressLine = readEnvironmentVariable('ARSM_COMPANY_ADDRESS_LINE')
param companyPostalCode = readEnvironmentVariable('ARSM_COMPANY_POSTAL_CODE')
param companyCity = readEnvironmentVariable('ARSM_COMPANY_CITY')
param companyTaxNumber = readEnvironmentVariable('ARSM_COMPANY_TAX_NUMBER')
param companyPhoneNumber = readEnvironmentVariable('ARSM_COMPANY_PHONE')
param companyEmail = readEnvironmentVariable('ARSM_COMPANY_EMAIL')
