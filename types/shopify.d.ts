export {};

declare global {
  interface Window {
    shopify?: {
      idToken?: () => Promise<string>;
      navigation?: {
        navigate: (path: string, options?: { history?: 'push' | 'replace' }) => void | Promise<unknown>;
      };
    };
  }
}
