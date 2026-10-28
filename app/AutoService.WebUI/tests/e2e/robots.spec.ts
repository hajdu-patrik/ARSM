/** robots.txt disallows crawling of every route, matching the noindex meta tags of the SPA. */
import { expect, test } from '@playwright/test';

test.describe('robots.txt', () => {
  test('disallows everything for every user agent and allows nothing', async ({ request }) => {
    const response = await request.get('/robots.txt');
    expect(response.ok()).toBe(true);

    const lines = (await response.text()).split(/\r?\n/).map((line) => line.trim());
    const userAgentIndex = lines.indexOf('User-agent: *');
    expect(userAgentIndex).toBeGreaterThanOrEqual(0);

    const group: string[] = [];
    for (const line of lines.slice(userAgentIndex + 1)) {
      if (line === '' || line.toLowerCase().startsWith('user-agent:')) {
        break;
      }
      group.push(line);
    }

    expect(group).toContain('Disallow: /');
    expect(lines).not.toContain('Allow: /');
  });
});
