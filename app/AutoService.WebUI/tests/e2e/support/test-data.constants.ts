export const MOCK_CUSTOMER_IDS = {
  anna: 101,
  bela: 102,
  nora: 103,
  adam: 104,
} as const;

export const MOCK_VEHICLE_IDS = {
  annaNxe441: 1001,
  annaPhe220: 1002,
  belaBrc918: 1003,
  adamElc404: 1004,
} as const;

export const MOCK_APPOINTMENT_IDS = {
  hybridInspection: 5001,
} as const;

export const MOCK_MECHANIC_IDS = {
  admin: 8001,
  gabor: 8002,
  peter: 8003,
  mate: 8004,
} as const;

export const PROTECTED_DEMO_MECHANIC_EMAILS = new Set([
  'gabor.kovacs@example.com',
  'peter.nagy@example.com',
  'mate.szabo@example.com',
]);

export const MOCK_PART_IDS = {
  timingBelt: 3001,
  brakePad: 3002,
} as const;

export const MOCK_LABOR_TYPE_IDS = {
  diagnostics: 4001,
  oilChange: 4002,
} as const;
