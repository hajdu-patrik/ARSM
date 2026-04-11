namespace AutoService.ApiService.Domain.UniqueTypes;

/**
 * Defines the broad vehicle-technology group a mechanic specialises in.
 * Persisted to the database as a string; explicit integer values are retained for
 * backwards compatibility if the conversion strategy ever changes.
 */
public enum SpecializationType
{
    GasolineAndDiesel = 1, // Conventional internal combustion engine vehicles.
    HybridAndElectric = 2, // Hybrid and full battery-electric vehicles.
    All = 3,               // No restriction — can work on any vehicle technology.
}