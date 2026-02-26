// MSAL Configuration for Microsoft OAuth

import { Configuration, LogLevel } from '@azure/msal-browser';

export const msalConfig: Configuration = {
  auth: {
    clientId: process.env.NEXT_PUBLIC_MICROSOFT_CLIENT_ID || '',
    // Use 'common' for multi-tenant (personal + work accounts)
    authority: 'https://login.microsoftonline.com/common',
    redirectUri: process.env.NEXT_PUBLIC_REDIRECT_URI || 'http://localhost:3000/auth/callback',
    postLogoutRedirectUri: '/',
  },
  cache: {
    cacheLocation: 'localStorage',
  },
  system: {
    loggerOptions: {
      loggerCallback: (level, message, containsPii) => {
        if (containsPii) return;
        switch (level) {
          case LogLevel.Error:
            console.error(message);
            break;
          case LogLevel.Warning:
            console.warn(message);
            break;
          case LogLevel.Info:
            console.info(message);
            break;
          case LogLevel.Verbose:
            console.debug(message);
            break;
        }
      },
      logLevel: LogLevel.Warning,
    },
  },
};

export const loginRequest = {
  scopes: [
    'User.Read',
    'Mail.Read',
    'Mail.Send',
    'Mail.ReadWrite',
    'Calendars.Read',
    'Calendars.ReadWrite',
  ],
};

export const graphConfig = {
  graphMeEndpoint: 'https://graph.microsoft.com/v1.0/me',
  graphMailEndpoint: 'https://graph.microsoft.com/v1.0/me/messages',
  graphCalendarEndpoint: 'https://graph.microsoft.com/v1.0/me/calendar',
  graphEventsEndpoint: 'https://graph.microsoft.com/v1.0/me/events',
};
