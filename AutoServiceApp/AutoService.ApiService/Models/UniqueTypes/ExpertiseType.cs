namespace AutoService.ApiService.Models.UniqueTypes;

/**
 * Defines the service areas a mechanic can be skilled in.
 * A mechanic must hold 1..10 unique expertise values; duplicates are rejected on save.
 */
public enum ExpertiseType
{
    Engine,           // Internal combustion engine repair and maintenance.
    Transmission,     // Gearbox, clutch, and drivetrain work.
    Brakes,           // Brake pads, discs, callipers, and ABS systems.
    Suspension,       // Shock absorbers, springs, and wheel alignment.
    ElectricalSystem, // Wiring, sensors, ECU, and battery systems.
    AirConditioning,  // Refrigerant handling, compressors, and climate control.
    ExhaustSystem,    // Catalytic converters, mufflers, and emission systems.
    FuelSystem,       // Fuel pumps, injectors, carburettors, and fuel lines.
    CoolingSystem,    // Radiators, thermostats, coolant, and water pumps.
    Bodywork          // Panel repairs, welding, and exterior damage.
}