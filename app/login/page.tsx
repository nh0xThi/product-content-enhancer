'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Page, Card, BlockStack, TextField, Button, Text, InlineStack } from '@shopify/polaris';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data?.error || 'Login failed');
        return;
      }
      router.push('/dashboard');
    } catch (err) {
      setError('Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Page title="Sign in">
      <div className="mx-auto w-full max-w-lg">
        <Card>
          <BlockStack gap="400">
            <Text as="h2" variant="headingMd">Welcome back</Text>
            {error ? <Text as="h2" tone="critical">{error}</Text> : null}
            <TextField
              label="Email"
              value={email}
              onChange={setEmail}
              autoComplete="email"
              type="email"
            />
            <TextField
              label="Password"
              value={password}
              onChange={setPassword}
              autoComplete="current-password"
              type="password"
            />
            <Button variant="primary" loading={loading} onClick={handleSubmit}>
              Sign in
            </Button>
            <InlineStack gap="200">
              <Text as="span" tone="subdued">Need an account?</Text>
              <Button variant="plain" url="/register">Create one</Button>
            </InlineStack>
          </BlockStack>
        </Card>
      </div>
    </Page>
  );
}
