import assert from 'node:assert/strict';
import test from 'node:test';

import {
  formataTelefoneBr,
  normalizaTelefoneBr,
  telefoneBrNacional,
  telefoneBrValido,
} from '../../shared/br-phone.js';

test('normaliza celular brasileiro para formato canônico com +55', () => {
  assert.equal(normalizaTelefoneBr('(41) 99549-4343'), '+5541995494343');
  assert.equal(normalizaTelefoneBr('+55 41 99549-4343'), '+5541995494343');
  assert.equal(normalizaTelefoneBr('0055 41 99549-4343'), '+5541995494343');
  assert.equal(telefoneBrNacional('+55 41 99549-4343'), '41995494343');
});

test('valida DDD e quantidade/formato dos dígitos', () => {
  assert.equal(telefoneBrValido('(41) 99549-4343'), true);
  assert.equal(telefoneBrValido('(11) 3333-4444'), true);
  assert.equal(telefoneBrValido('(20) 99549-4343'), false);
  assert.equal(telefoneBrValido('(41) 89549-4343'), false);
  assert.equal(telefoneBrValido('(41) 1111-1111'), false);
  assert.equal(telefoneBrValido('(41) 99549-43430'), false);
  assert.equal(normalizaTelefoneBr('(20) 99549-4343'), '');
});

test('aplica máscara progressiva sem ultrapassar onze dígitos nacionais', () => {
  assert.equal(formataTelefoneBr('4'), '(4');
  assert.equal(formataTelefoneBr('4199'), '(41) 99');
  assert.equal(formataTelefoneBr('41995494343'), '(41) 99549-4343');
  assert.equal(formataTelefoneBr('+55 41 99549-4343'), '(41) 99549-4343');
});
