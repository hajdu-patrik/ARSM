import type { Route } from '@playwright/test';
import type { CreatePartRequest, PartDto, UpdatePartRequest } from '../../../src/types/catalog/catalog.types';
import type { MockApiState } from './test-data';
import { fulfillJson, fulfillNoContent } from './api-mock-response';
import { resolveGrossAmount } from './api-mock-catalog-pricing';

export async function tryHandlePartRoute(route: Route, method: string, path: string, state: MockApiState): Promise<boolean> {
  if (path === '/api/parts' && method === 'GET') {
    await fulfillJson(route, state.parts);
    return true;
  }

  if (path === '/api/parts' && method === 'POST') {
    await handleCreatePart(route, state);
    return true;
  }

  const match = /^\/api\/parts\/(\d+)$/.exec(path);
  if (!match) {
    return false;
  }

  const id = Number(match[1]);
  if (method === 'PUT') {
    await handleUpdatePart(route, state, id);
    return true;
  }

  if (method === 'DELETE') {
    await handleDeletePart(route, state, id);
    return true;
  }

  return false;
}

async function handleCreatePart(route: Route, state: MockApiState): Promise<void> {
  const payload = route.request().postDataJSON() as CreatePartRequest;

  if (!payload.partNumber?.trim() || !payload.name?.trim()) {
    await fulfillJson(route, { detail: 'PartNumber and Name are required.' }, 422);
    return;
  }

  if (state.parts.some((part) => part.partNumber === payload.partNumber)) {
    await fulfillJson(route, { detail: 'A part with this part number already exists.' }, 409);
    return;
  }

  const created: PartDto = {
    id: state.nextPartId++,
    partNumber: payload.partNumber,
    name: payload.name,
    netUnitPrice: payload.netUnitPrice,
    vatRatePercent: payload.vatRatePercent,
    grossUnitPrice: resolveGrossAmount(state, payload.netUnitPrice, payload.vatRatePercent),
  };

  state.parts.push(created);
  await fulfillJson(route, created, 201);
}

async function handleUpdatePart(route: Route, state: MockApiState, id: number): Promise<void> {
  const index = state.parts.findIndex((part) => part.id === id);
  if (index < 0) {
    await fulfillJson(route, { detail: 'Part not found.' }, 404);
    return;
  }

  const payload = route.request().postDataJSON() as UpdatePartRequest;
  const hasDuplicate = state.parts.some((part) => part.id !== id && part.partNumber === payload.partNumber);
  if (hasDuplicate) {
    await fulfillJson(route, { detail: 'A part with this part number already exists.' }, 409);
    return;
  }

  state.parts[index] = {
    ...state.parts[index],
    partNumber: payload.partNumber,
    name: payload.name,
    netUnitPrice: payload.netUnitPrice,
    vatRatePercent: payload.vatRatePercent,
    grossUnitPrice: resolveGrossAmount(state, payload.netUnitPrice, payload.vatRatePercent),
  };

  // Real backend contract: PUT returns 204 No Content, not the updated resource.
  await fulfillNoContent(route);
}

async function handleDeletePart(route: Route, state: MockApiState, id: number): Promise<void> {
  const index = state.parts.findIndex((part) => part.id === id);
  if (index < 0) {
    await fulfillJson(route, { detail: 'Part not found.' }, 404);
    return;
  }

  state.parts.splice(index, 1);
  await fulfillNoContent(route);
}
