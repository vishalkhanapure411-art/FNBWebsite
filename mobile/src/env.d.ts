/**
 * Environment variable typing for Expo's EXPO_PUBLIC_* inlining.
 * Metro/babel statically inlines `process.env.EXPO_PUBLIC_API_URL` at bundle time.
 */
declare const process: {
  env: {
    EXPO_PUBLIC_API_URL?: string;
  };
};
