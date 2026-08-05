import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { awsCredentialsProvider } from '@vercel/oidc-aws-credentials-provider';

export class AwsRuntimeIdentityError extends Error {
  constructor(message = 'aws_runtime_identity_not_configured') {
    super(message);
    this.name = 'AwsRuntimeIdentityError';
  }
}

const safeSessionName = (environment) => `growx-prevenda-${String(environment || 'runtime')}`
  .replace(/[^A-Za-z0-9+=,.@_-]/g, '-')
  .slice(0, 64);

export function buildDynamoClientConfig(env = process.env) {
  const region = env.AWS_REGION || env.AWS_DEFAULT_REGION || 'sa-east-1';
  const roleArn = String(env.AWS_ROLE_ARN || '').trim();
  const vercelEnvironment = String(env.VERCEL_ENV || '').trim();

  // Produção na Vercel nunca recua silenciosamente para access keys estáticas.
  if (vercelEnvironment === 'production' && !roleArn) {
    throw new AwsRuntimeIdentityError();
  }

  if (!roleArn) return { region };

  return {
    region,
    credentials: awsCredentialsProvider({
      roleArn,
      roleSessionName: safeSessionName(vercelEnvironment),
      audience: 'sts.amazonaws.com',
      durationSeconds: 900,
      clientConfig: { region },
    }),
  };
}

let defaultClient;

export function getDynamoClient() {
  if (!defaultClient) defaultClient = new DynamoDBClient(buildDynamoClientConfig());
  return defaultClient;
}

export function resetDynamoClientForTests() {
  defaultClient?.destroy?.();
  defaultClient = undefined;
}
