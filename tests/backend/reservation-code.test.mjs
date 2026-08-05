import assert from 'node:assert/strict';
import test from 'node:test';

import { reservationCode } from '../../shared/reservation-code.js';

test('gera código de reserva curto, estável e legível a partir do request id', () => {
  assert.equal(
    reservationCode('123e4567-e89b-42d3-a456-426614174000'),
    'GX-123E-4567-E89B',
  );
  assert.equal(
    reservationCode('123E4567E89B42D3A456426614174000'),
    'GX-123E-4567-E89B',
  );
});

test('não fabrica código para referência ausente ou inválida', () => {
  assert.equal(reservationCode(''), '');
  assert.equal(reservationCode('cs_test_123'), '');
  assert.equal(reservationCode('123e4567-e89b-42d3-a456'), '');
});
