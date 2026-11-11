import { assert, assertEquals, assertNotEquals } from 'jsr:@std/assert@1';

import { decrypt, encrypt, signState, verifyState } from './crypto.ts';
import { isAllowedReturnUrl, toMinimalEvents } from './google.ts';

Deno.test('encrypt/decrypt round-trips and uses a fresh IV', async () => {
  const a = await encrypt('refresh-token', 'secret');
  const b = await encrypt('refresh-token', 'secret');
  assertNotEquals(a, b);
  assertEquals(await decrypt(a, 'secret'), 'refresh-token');
  let failed = false;
  try {
    await decrypt(a, 'other-secret');
  } catch {
    failed = true;
  }
  assert(failed, 'wrong key must not decrypt');
});

Deno.test('state is tamper-evident', async () => {
  const s = await signState({ uid: 'u1', ret: 'intentional://x', exp: 1 }, 'k');
  assertEquals(await verifyState(s, 'k'), { uid: 'u1', ret: 'intentional://x', exp: 1 });
  assertEquals(await verifyState(s, 'other'), null);
  const [body, sig] = s.split('.');
  const forged = btoa(JSON.stringify({ uid: 'attacker', ret: 'intentional://x', exp: 1 })).replace(/=+$/, '');
  assertEquals(await verifyState(`${forged}.${sig}`, 'k'), null);
  assertEquals(await verifyState(`${body}`, 'k'), null);
});

Deno.test('only app deep links are allowed return targets', () => {
  assert(isAllowedReturnUrl('intentional://google-connected'));
  assert(isAllowedReturnUrl('exp://192.168.1.4:8081/--/google-connected'));
  assert(!isAllowedReturnUrl('https://evil.example/steal'));
  assert(!isAllowedReturnUrl('javascript:alert(1)'));
});

Deno.test('events are reduced to the minimum and filtered', () => {
  const out = toMinimalEvents([
    { id: '1', summary: 'Standup', start: { dateTime: '2026-11-11T09:30:00-08:00' }, end: { dateTime: '2026-11-11T09:45:00-08:00' }, attendees: [{ self: true, responseStatus: 'accepted' }] },
    { id: '2', summary: 'Declined', start: { dateTime: 'x' }, end: { dateTime: 'y' }, attendees: [{ self: true, responseStatus: 'declined' }] },
    { id: '3', status: 'cancelled', summary: 'Cancelled' },
    { id: '4', start: { date: '2026-11-12' }, end: { date: '2026-11-13' }, transparency: 'transparent' },
  ]);
  assertEquals(out, [
    { id: '1', title: 'Standup', allDay: false, start: '2026-11-11T09:30:00-08:00', end: '2026-11-11T09:45:00-08:00', free: false },
    { id: '4', title: '(No title)', allDay: true, startDate: '2026-11-12', endDate: '2026-11-13', free: true },
  ]);
});
