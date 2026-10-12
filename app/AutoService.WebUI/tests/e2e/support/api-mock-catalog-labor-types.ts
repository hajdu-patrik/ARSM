import type { Route } from '@playwright/test';
import type { CreateLaborTypeRequest, LaborTypeDto, UpdateLaborTypeRequest } from '../../../src/types/catalog/catalog.types';
import type { MockApiState } from './test-data';
import { compareText, fulfillPaged } from './api-mock-paging';
import { fulfillJson, fulfillNoContent } from './api-mock-response';
import { INVALID_VAT_RATE_DETAIL, isAllowedVatRate, resolveGrossAmount } from './api-mock-catalog-pricing';

/** Dispatches `/api/labor-types` mock requests (list, create, update, delete). */
export async function tryHandleLaborTypeRoute(route: Route, method: string, path: string, state: MockApiState): Promise<boolean> {
  if (path === '/api/labor-types' && method === 'GET') {
    await fulfillPaged(route, state.laborTypes, {
      searchFields: (laborType) => [laborType.code, laborType.name],
      compare: (left, right) => compareText(left.code, right.code) || left.id - right.id,
    });
    return true;
  }

  if (path === '/api/labor-types' && method === 'POST') {
    await handleCreateLaborType(route, state);
    return true;
  }

  const match = /^\/api\/labor-types\/(\d+)$/.exec(path);
  if (!match) {
    return false;
  }

  const id = Number(match[1]);
  if (method === 'PUT') {
    await handleUpdateLaborType(route, state, id);
    return true;
  }

  if (method === 'DELETE') {
    await handleDeleteLaborType(route, state, id);
    return true;
  }

  return false;
}

async function handleCreateLaborType(route: Route, state: MockApiState): Promise<void> {
  const { code, name, hourlyNetRate, vatRatePercent } = route.request().postDataJSON() as Partial<CreateLaborTypeRequest>;

  if (!code?.trim() || !name?.trim() || hourlyNetRate === undefined || vatRatePercent === undefined) {
    await fulfillJson(route, { detail: 'Code and Name are required.' }, 422);
    return;
  }

  if (!isAllowedVatRate(vatRatePercent)) {
    await fulfillJson(route, { detail: INVALID_VAT_RATE_DETAIL }, 422);
    return;
  }

  if (state.laborTypes.some((laborType) => laborType.code === code)) {
    await fulfillJson(route, { detail: 'A labor type with this code already exists.' }, 409);
    return;
  }

  const created: LaborTypeDto = {
    id: state.nextLaborTypeId++,
    code,
    name,
    hourlyNetRate,
    vatRatePercent,
    grossHourlyRate: resolveGrossAmount(state, hourlyNetRate, vatRatePercent),
  };

  state.laborTypes.push(created);
  await fulfillJson(route, created, 201);
}

async function handleUpdateLaborType(route: Route, state: MockApiState, id: number): Promise<void> {
  const existing = state.laborTypes.find((laborType) => laborType.id === id);
  if (!existing) {
    await fulfillJson(route, { detail: 'Labor type not found.' }, 404);
    return;
  }

  const payload = route.request().postDataJSON() as UpdateLaborTypeRequest;
  if (!isAllowedVatRate(payload.vatRatePercent)) {
    await fulfillJson(route, { detail: INVALID_VAT_RATE_DETAIL }, 422);
    return;
  }

  const hasDuplicate = state.laborTypes.some((laborType) => laborType.id !== id && laborType.code === payload.code);
  if (hasDuplicate) {
    await fulfillJson(route, { detail: 'A labor type with this code already exists.' }, 409);
    return;
  }

  state.laborTypes[state.laborTypes.indexOf(existing)] = {
    ...existing,
    code: payload.code,
    name: payload.name,
    hourlyNetRate: payload.hourlyNetRate,
    vatRatePercent: payload.vatRatePercent,
    grossHourlyRate: resolveGrossAmount(state, payload.hourlyNetRate, payload.vatRatePercent),
  };

  // Real backend contract: PUT returns 204 No Content, not the updated resource.
  await fulfillNoContent(route);
}

async function handleDeleteLaborType(route: Route, state: MockApiState, id: number): Promise<void> {
  const index = state.laborTypes.findIndex((laborType) => laborType.id === id);
  if (index < 0) {
    await fulfillJson(route, { detail: 'Labor type not found.' }, 404);
    return;
  }

  state.laborTypes.splice(index, 1);
  await fulfillNoContent(route);
}
