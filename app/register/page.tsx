'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Page, Card, BlockStack, TextField, Button, Text, InlineStack } from '@shopify/polaris';

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data?.error || 'Registration failed');
        return;
      }
      router.push('/dashboard');
    } catch (err) {
      setError('Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Page title="Create account">
      <div className="mx-auto w-full max-w-lg">
        <Card>
          <BlockStack gap="400">
            <Text as="h2" variant="headingMd">Create your account</Text>
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
              autoComplete="new-password"
              type="password"
              helpText="Minimum 8 characters."
            />
            <TextField
              label="Confirm password"
              value={confirmPassword}
              onChange={setConfirmPassword}
              autoComplete="new-password"
              type="password"
            />
            <Button variant="primary" loading={loading} onClick={handleSubmit}>
              Create account
            </Button>
            <InlineStack gap="200">
              <Text as="span" tone="subdued">Already have an account?</Text>
              <Button variant="plain" url="/login">Sign in</Button>
            </InlineStack>
          </BlockStack>
        </Card>
      </div>
    </Page>
  );
}
