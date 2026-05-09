import { defineAuth, secret } from '@aws-amplify/backend';
import { preSignUpTrigger } from './pre-sign-up-trigger/resource';

export const auth = defineAuth({
  loginWith: {
    email: true,
    externalProviders: {
      google: {
        clientId: secret('GOOGLE_CLIENT_ID'),
        clientSecret: secret('GOOGLE_CLIENT_SECRET'),
        scopes: ['email', 'profile', 'openid'],
        attributeMapping: {
          email: 'email',
          givenName: 'given_name',
          familyName: 'family_name',
          fullname: 'name',
        },
      },
      callbackUrls: [
        'http://localhost:3000/auth',
        'https://staging.d3nyg9qvz1tj5n.amplifyapp.com/auth',
        'https://friendsintelligence.net/auth',
      ],
      logoutUrls: [
        'http://localhost:3000/auth',
        'https://staging.d3nyg9qvz1tj5n.amplifyapp.com/auth',
        'https://friendsintelligence.net/auth',
      ],
    },
  },
  triggers: {
    preSignUp: preSignUpTrigger,
  },
});
