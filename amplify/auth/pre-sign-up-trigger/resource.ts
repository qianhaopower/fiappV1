import { defineFunction } from '@aws-amplify/backend';

export const preSignUpTrigger = defineFunction({
  name: 'pre-sign-up-trigger',
  entry: './handler.ts',
});
