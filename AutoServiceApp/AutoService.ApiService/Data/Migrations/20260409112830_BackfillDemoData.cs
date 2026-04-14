/**
 * 20260409112830_BackfillDemoData.cs
 *
 * Auto-generated documentation header for this source file.
 */

﻿using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AutoService.ApiService.Data.Migrations
{public partial class BackfillDemoData : Migration
    {protected override void Up(MigrationBuilder migrationBuilder)
                {
                        migrationBuilder.Sql(
                                """
                                INSERT INTO people ("FirstName", "MiddleName", "LastName", "Email", "PhoneNumber", "PersonType")
                                SELECT 'Anna', 'Maria', 'Toth', 'anna.toth@gmail.com', '+36304445566', 'Customer'
                                WHERE NOT EXISTS (
                                        SELECT 1 FROM people WHERE "Email" = 'anna.toth@gmail.com'
                                );

                                INSERT INTO people ("FirstName", "MiddleName", "LastName", "Email", "PhoneNumber", "PersonType")
                                SELECT 'Bence', NULL, 'Farkas', 'bence.farkas@gmail.com', '+36305556677', 'Customer'
                                WHERE NOT EXISTS (
                                        SELECT 1 FROM people WHERE "Email" = 'bence.farkas@gmail.com'
                                );

                                INSERT INTO people ("FirstName", "MiddleName", "LastName", "Email", "PhoneNumber", "PersonType")
                                SELECT 'Csilla', 'Kata', 'Varga', 'csilla.varga@gmail.com', NULL, 'Customer'
                                WHERE NOT EXISTS (
                                        SELECT 1 FROM people WHERE "Email" = 'csilla.varga@gmail.com'
                                );

                                INSERT INTO people ("FirstName", "MiddleName", "LastName", "Email", "PhoneNumber", "PersonType")
                                SELECT 'David', NULL, 'Kiss', 'david.kiss@gmail.com', '+36306667788', 'Customer'
                                WHERE NOT EXISTS (
                                        SELECT 1 FROM people WHERE "Email" = 'david.kiss@gmail.com'
                                );

                                INSERT INTO people ("FirstName", "MiddleName", "LastName", "Email", "PhoneNumber", "PersonType")
                                SELECT 'Emese', NULL, 'Lakatos', 'emese.lakatos@gmail.com', NULL, 'Customer'
                                WHERE NOT EXISTS (
                                        SELECT 1 FROM people WHERE "Email" = 'emese.lakatos@gmail.com'
                                );

                                INSERT INTO vehicles ("LicensePlate", "Brand", "Model", "Year", "MileageKm", "EnginePowerHp", "EngineTorqueNm", "CustomerId")
                                SELECT 'ABC-101', 'Volkswagen', 'Golf', 2018, 124500, 110, 250, c."Id"
                                FROM people c
                                WHERE c."PersonType" = 'Customer'
                                    AND c."Email" = 'anna.toth@gmail.com'
                                    AND NOT EXISTS (
                                            SELECT 1 FROM vehicles WHERE "LicensePlate" = 'ABC-101'
                                    );

                                INSERT INTO vehicles ("LicensePlate", "Brand", "Model", "Year", "MileageKm", "EnginePowerHp", "EngineTorqueNm", "CustomerId")
                                SELECT 'BCD-202', 'Toyota', 'Corolla Hybrid', 2021, 63200, 122, 190, c."Id"
                                FROM people c
                                WHERE c."PersonType" = 'Customer'
                                    AND c."Email" = 'bence.farkas@gmail.com'
                                    AND NOT EXISTS (
                                            SELECT 1 FROM vehicles WHERE "LicensePlate" = 'BCD-202'
                                    );

                                INSERT INTO vehicles ("LicensePlate", "Brand", "Model", "Year", "MileageKm", "EnginePowerHp", "EngineTorqueNm", "CustomerId")
                                SELECT 'CDE-303', 'Tesla', 'Model 3', 2022, 48000, 283, 420, c."Id"
                                FROM people c
                                WHERE c."PersonType" = 'Customer'
                                    AND c."Email" = 'csilla.varga@gmail.com'
                                    AND NOT EXISTS (
                                            SELECT 1 FROM vehicles WHERE "LicensePlate" = 'CDE-303'
                                    );

                                INSERT INTO vehicles ("LicensePlate", "Brand", "Model", "Year", "MileageKm", "EnginePowerHp", "EngineTorqueNm", "CustomerId")
                                SELECT 'DEF-404', 'Ford', 'Focus', 2016, 167800, 125, 200, c."Id"
                                FROM people c
                                WHERE c."PersonType" = 'Customer'
                                    AND c."Email" = 'david.kiss@gmail.com'
                                    AND NOT EXISTS (
                                            SELECT 1 FROM vehicles WHERE "LicensePlate" = 'DEF-404'
                                    );

                                INSERT INTO vehicles ("LicensePlate", "Brand", "Model", "Year", "MileageKm", "EnginePowerHp", "EngineTorqueNm", "CustomerId")
                                SELECT 'EFG-505', 'BMW', '320d', 2019, 91300, 190, 400, c."Id"
                                FROM people c
                                WHERE c."PersonType" = 'Customer'
                                    AND c."Email" = 'emese.lakatos@gmail.com'
                                    AND NOT EXISTS (
                                            SELECT 1 FROM vehicles WHERE "LicensePlate" = 'EFG-505'
                                    );

                                INSERT INTO appointments ("ScheduledDate", "TaskDescription", "Status", "VehicleId", "CompletedAt", "CanceledAt")
                                SELECT now() + interval '2 days', 'Idoszakos olajcsere es altalanos atvizsgalas', 'InProgress', v."Id", NULL, NULL
                                FROM vehicles v
                                WHERE v."LicensePlate" = 'ABC-101'
                                    AND NOT EXISTS (
                                            SELECT 1
                                            FROM appointments a
                                            WHERE a."VehicleId" = v."Id"
                                                AND a."TaskDescription" = 'Idoszakos olajcsere es altalanos atvizsgalas'
                                    );

                                INSERT INTO appointments ("ScheduledDate", "TaskDescription", "Status", "VehicleId", "CompletedAt", "CanceledAt")
                                SELECT now() + interval '4 days', 'Fekrendszer ellenorzes es betetcsere', 'InProgress', v."Id", NULL, NULL
                                FROM vehicles v
                                WHERE v."LicensePlate" = 'BCD-202'
                                    AND NOT EXISTS (
                                            SELECT 1
                                            FROM appointments a
                                            WHERE a."VehicleId" = v."Id"
                                                AND a."TaskDescription" = 'Fekrendszer ellenorzes es betetcsere'
                                    );

                                INSERT INTO appointments ("ScheduledDate", "TaskDescription", "Status", "VehicleId", "CompletedAt", "CanceledAt")
                                SELECT now() - interval '1 day', 'Motor diagnozis es kipufogo javitas', 'InProgress', v."Id", NULL, NULL
                                FROM vehicles v
                                WHERE v."LicensePlate" = 'CDE-303'
                                    AND NOT EXISTS (
                                            SELECT 1
                                            FROM appointments a
                                            WHERE a."VehicleId" = v."Id"
                                                AND a."TaskDescription" = 'Motor diagnozis es kipufogo javitas'
                                    );

                                INSERT INTO appointments ("ScheduledDate", "TaskDescription", "Status", "VehicleId", "CompletedAt", "CanceledAt")
                                SELECT now() - interval '7 days', 'Futomu beallitas es kormanygeometria', 'Completed', v."Id", now() - interval '6 days 22 hours', NULL
                                FROM vehicles v
                                WHERE v."LicensePlate" = 'DEF-404'
                                    AND NOT EXISTS (
                                            SELECT 1
                                            FROM appointments a
                                            WHERE a."VehicleId" = v."Id"
                                                AND a."TaskDescription" = 'Futomu beallitas es kormanygeometria'
                                    );

                                INSERT INTO appointments ("ScheduledDate", "TaskDescription", "Status", "VehicleId", "CompletedAt", "CanceledAt")
                                SELECT now() - interval '3 days', 'Akkumulator csere es elektromos hiba keresese', 'Cancelled', v."Id", NULL, now() - interval '2 days 23 hours'
                                FROM vehicles v
                                WHERE v."LicensePlate" = 'EFG-505'
                                    AND NOT EXISTS (
                                            SELECT 1
                                            FROM appointments a
                                            WHERE a."VehicleId" = v."Id"
                                                AND a."TaskDescription" = 'Akkumulator csere es elektromos hiba keresese'
                                    );

                                INSERT INTO appointmentmechanics ("AppointmentId", "MechanicId")
                                SELECT a."Id", candidate."MechanicId"
                                FROM appointments a
                                JOIN vehicles v ON v."Id" = a."VehicleId"
                                CROSS JOIN (
                                        SELECT COALESCE(
                                                (SELECT m."Id" FROM people m WHERE m."PersonType" = 'Mechanic' AND m."Email" = 'gabor.kovacs@gmail.com' LIMIT 1),
                                                (SELECT m."Id" FROM people m WHERE m."PersonType" = 'Mechanic' ORDER BY m."Id" LIMIT 1)
                                        ) AS "MechanicId"
                                ) candidate
                                WHERE v."LicensePlate" = 'ABC-101'
                                    AND a."TaskDescription" = 'Idoszakos olajcsere es altalanos atvizsgalas'
                                    AND candidate."MechanicId" IS NOT NULL
                                    AND NOT EXISTS (
                                            SELECT 1
                                            FROM appointmentmechanics am
                                            WHERE am."AppointmentId" = a."Id"
                                                AND am."MechanicId" = candidate."MechanicId"
                                    );

                                INSERT INTO appointmentmechanics ("AppointmentId", "MechanicId")
                                SELECT a."Id", candidate."MechanicId"
                                FROM appointments a
                                JOIN vehicles v ON v."Id" = a."VehicleId"
                                CROSS JOIN (
                                        SELECT COALESCE(
                                                (SELECT m."Id" FROM people m WHERE m."PersonType" = 'Mechanic' AND m."Email" = 'peter.nagy@gmail.com' LIMIT 1),
                                                (SELECT m."Id" FROM people m WHERE m."PersonType" = 'Mechanic' ORDER BY m."Id" OFFSET 1 LIMIT 1),
                                                (SELECT m."Id" FROM people m WHERE m."PersonType" = 'Mechanic' ORDER BY m."Id" LIMIT 1)
                                        ) AS "MechanicId"
                                ) candidate
                                WHERE v."LicensePlate" = 'BCD-202'
                                    AND a."TaskDescription" = 'Fekrendszer ellenorzes es betetcsere'
                                    AND candidate."MechanicId" IS NOT NULL
                                    AND NOT EXISTS (
                                            SELECT 1
                                            FROM appointmentmechanics am
                                            WHERE am."AppointmentId" = a."Id"
                                                AND am."MechanicId" = candidate."MechanicId"
                                    );

                                INSERT INTO appointmentmechanics ("AppointmentId", "MechanicId")
                                SELECT a."Id", candidate."MechanicId"
                                FROM appointments a
                                JOIN vehicles v ON v."Id" = a."VehicleId"
                                CROSS JOIN (
                                        SELECT COALESCE(
                                                (SELECT m."Id" FROM people m WHERE m."PersonType" = 'Mechanic' AND m."Email" = 'mate.szabo@gmail.com' LIMIT 1),
                                                (SELECT m."Id" FROM people m WHERE m."PersonType" = 'Mechanic' ORDER BY m."Id" OFFSET 2 LIMIT 1),
                                                (SELECT m."Id" FROM people m WHERE m."PersonType" = 'Mechanic' ORDER BY m."Id" LIMIT 1)
                                        ) AS "MechanicId"
                                ) candidate
                                WHERE v."LicensePlate" = 'CDE-303'
                                    AND a."TaskDescription" = 'Motor diagnozis es kipufogo javitas'
                                    AND candidate."MechanicId" IS NOT NULL
                                    AND NOT EXISTS (
                                            SELECT 1
                                            FROM appointmentmechanics am
                                            WHERE am."AppointmentId" = a."Id"
                                                AND am."MechanicId" = candidate."MechanicId"
                                    );

                                INSERT INTO appointmentmechanics ("AppointmentId", "MechanicId")
                                SELECT a."Id", candidate."MechanicId"
                                FROM appointments a
                                JOIN vehicles v ON v."Id" = a."VehicleId"
                                CROSS JOIN (
                                        SELECT COALESCE(
                                                (SELECT m."Id" FROM people m WHERE m."PersonType" = 'Mechanic' AND m."Email" = 'gabor.kovacs@gmail.com' LIMIT 1),
                                                (SELECT m."Id" FROM people m WHERE m."PersonType" = 'Mechanic' ORDER BY m."Id" LIMIT 1)
                                        ) AS "MechanicId"
                                ) candidate
                                WHERE v."LicensePlate" = 'DEF-404'
                                    AND a."TaskDescription" = 'Futomu beallitas es kormanygeometria'
                                    AND candidate."MechanicId" IS NOT NULL
                                    AND NOT EXISTS (
                                            SELECT 1
                                            FROM appointmentmechanics am
                                            WHERE am."AppointmentId" = a."Id"
                                                AND am."MechanicId" = candidate."MechanicId"
                                    );

                                INSERT INTO appointmentmechanics ("AppointmentId", "MechanicId")
                                SELECT a."Id", candidate."MechanicId"
                                FROM appointments a
                                JOIN vehicles v ON v."Id" = a."VehicleId"
                                CROSS JOIN (
                                        SELECT COALESCE(
                                                (SELECT m."Id" FROM people m WHERE m."PersonType" = 'Mechanic' AND m."Email" = 'mate.szabo@gmail.com' LIMIT 1),
                                                (SELECT m."Id" FROM people m WHERE m."PersonType" = 'Mechanic' ORDER BY m."Id" OFFSET 2 LIMIT 1),
                                                (SELECT m."Id" FROM people m WHERE m."PersonType" = 'Mechanic' ORDER BY m."Id" LIMIT 1)
                                        ) AS "MechanicId"
                                ) candidate
                                WHERE v."LicensePlate" = 'DEF-404'
                                    AND a."TaskDescription" = 'Futomu beallitas es kormanygeometria'
                                    AND candidate."MechanicId" IS NOT NULL
                                    AND NOT EXISTS (
                                            SELECT 1
                                            FROM appointmentmechanics am
                                            WHERE am."AppointmentId" = a."Id"
                                                AND am."MechanicId" = candidate."MechanicId"
                                    );

                                INSERT INTO appointmentmechanics ("AppointmentId", "MechanicId")
                                SELECT a."Id", candidate."MechanicId"
                                FROM appointments a
                                JOIN vehicles v ON v."Id" = a."VehicleId"
                                CROSS JOIN (
                                        SELECT COALESCE(
                                                (SELECT m."Id" FROM people m WHERE m."PersonType" = 'Mechanic' AND m."Email" = 'peter.nagy@gmail.com' LIMIT 1),
                                                (SELECT m."Id" FROM people m WHERE m."PersonType" = 'Mechanic' ORDER BY m."Id" OFFSET 1 LIMIT 1),
                                                (SELECT m."Id" FROM people m WHERE m."PersonType" = 'Mechanic' ORDER BY m."Id" LIMIT 1)
                                        ) AS "MechanicId"
                                ) candidate
                                WHERE v."LicensePlate" = 'EFG-505'
                                    AND a."TaskDescription" = 'Akkumulator csere es elektromos hiba keresese'
                                    AND candidate."MechanicId" IS NOT NULL
                                    AND NOT EXISTS (
                                            SELECT 1
                                            FROM appointmentmechanics am
                                            WHERE am."AppointmentId" = a."Id"
                                                AND am."MechanicId" = candidate."MechanicId"
                                    );
                                """);
                }protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Intentionally left empty to keep this backfill migration non-destructive.
        }
    }
}
