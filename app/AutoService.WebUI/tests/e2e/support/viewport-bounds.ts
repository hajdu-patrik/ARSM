import { expect, type Locator } from '@playwright/test';

/** Asserts the element's box lies inside the given viewport width. */
export async function expectInsideViewport(target: Locator, viewportWidth: number): Promise<void> {
  const box = await target.boundingBox();
  expect(box).not.toBeNull();
  expect(box?.x).toBeGreaterThanOrEqual(0);
  expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(viewportWidth + 0.5);
}
