import type { PreSignUpTriggerHandler } from 'aws-lambda';
import {
  CognitoIdentityProviderClient,
  ListUsersCommand,
  AdminLinkProviderForUserCommand,
} from '@aws-sdk/client-cognito-identity-provider';

const client = new CognitoIdentityProviderClient({});

export const handler: PreSignUpTriggerHandler = async (event) => {
  const { userPoolId, request: { userAttributes }, userName, triggerSource } = event;
  const email = userAttributes.email;

  // Direction 1: existing email/password user → signs in with Google.
  // Link the Google identity to the existing native account so their data is preserved.
  if (triggerSource === 'PreSignUp_ExternalProvider') {
    const underscoreIdx = userName.indexOf('_');
    const providerName = userName.slice(0, underscoreIdx);    // "google"
    const providerUserId = userName.slice(underscoreIdx + 1); // Google sub

    const { Users } = await client.send(new ListUsersCommand({
      UserPoolId: userPoolId,
      Filter: `email = "${email}"`,
    }));

    const nativeUser = Users?.find(u => u.UserStatus !== 'EXTERNAL_PROVIDER');
    if (!nativeUser?.Username) return event;

    await client.send(new AdminLinkProviderForUserCommand({
      UserPoolId: userPoolId,
      SourceUser: {
        ProviderName: providerName.charAt(0).toUpperCase() + providerName.slice(1), // "Google"
        ProviderAttributeName: 'Cognito_Subject',
        ProviderAttributeValue: providerUserId,
      },
      DestinationUser: {
        ProviderName: 'Cognito',
        ProviderAttributeValue: nativeUser.Username,
      },
    }));

    return event;
  }

  // Direction 2: existing Google user → tries to create email/password account.
  // Block immediately before Cognito creates an UNCONFIRMED orphan user.
  if (triggerSource === 'PreSignUp_SignUp') {
    const { Users } = await client.send(new ListUsersCommand({
      UserPoolId: userPoolId,
      Filter: `email = "${email}"`,
    }));

    const googleUser = Users?.find(u => u.Username?.startsWith('google_'));
    if (googleUser) {
      throw new Error(
        'An account with this email already exists via Google Sign-In. ' +
        'Please use the "Sign in with Google" button instead.'
      );
    }
  }

  return event;
};
