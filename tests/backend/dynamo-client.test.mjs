import assert from 'node:assert/strict';
import test from 'node:test';

import {
  AwsRuntimeIdentityError,
  buildDynamoClientConfig,
} from '../../api/_lib/dynamo-client.js';

test('produção Vercel exige role OIDC e nunca cai em access key estática', () => {
  assert.throws(
    () => buildDynamoClientConfig({
      VERCEL_ENV: 'production',
      AWS_ACCESS_KEY_ID: 'legacy-key-must-not-be-used',
      AWS_SECRET_ACCESS_KEY: 'legacy-secret-must-not-be-used',
    }),
    AwsRuntimeIdentityError,
  );
});

test('configuração OIDC usa audiência STS e sessão curta', async () => {
  const config = buildDynamoClientConfig({
    VERCEL_ENV: 'production',
    AWS_REGION: 'sa-east-1',
    AWS_ROLE_ARN: 'arn:aws:iam::924665350190:role/growx-prevenda-vercel-prod',
  });

  assert.equal(config.region, 'sa-east-1');
  assert.equal(typeof config.credentials, 'function');
});

test('desenvolvimento local preserva a cadeia padrão do SDK sem embutir segredo', () => {
  assert.deepEqual(buildDynamoClientConfig({ AWS_REGION: 'sa-east-1' }), {
    region: 'sa-east-1',
  });
});
