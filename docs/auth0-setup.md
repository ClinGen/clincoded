# Auth0 Integration

With Mozilla's Persona service [being sunsetted](https://developer.mozilla.org/en-US/Persona), the project's authentication needs were transitioned to the [Auth0](https://auth0.com/) service. Auth0 was chosen because it provides easy integration to many social accounts (Google, Microsoft, Github, Twitter, etc.) while also providing its own user/password database. Auth0 also allows for wildcard subdomain callback URLs, even for platforms that usually do not allow them (e.g. Google Auth). ClinGen currently supports Google and the user-password database login methods.


## Auth0 setup

1. Navigate to the Auth0 [management dashboard](https://manage.auth0.com/)
2. Add a **New Client**

3. Specify a name for the client and select **Single Page Application** as the client type

4. On the **Settings** tab for the client, specify the comma-delimited list of **Allowed Callback URLs** for the client, including test URLs. For example:
> http://localhost:6543/callback, https://localhost:6543/callback, http://*.clinicalgenome.org/callback, https://*.clinicalgenome.org/callback, http://*.demo.clinicalgenome.org/callback, https://*.demo.clinicalgenome.org/callback, http://*.instance.clinicalgenome.org/callback, https://*.instance.clinicalgenome.org/callback

5. In the **Addons** and **Connections** tabs, enable the signup methods you want to allow. Even if you do not allow users to use the Username-Password-Authentication Database option, you should enable it to add the account for automated tests later.


## Google Auth setup

While logged in to the Google account that will serve as the master account for the site's authentication app, go to the [Developer's Console](https://console.developers.google.com/).

Add app?

Navigate to the **Credentials** tab then **Create Credentials** for the app of the **OAuth Client ID** type. Select **Web application** for the Application type, give it a name, and add the Auth0 callback URI to the list of **Authorized redirect URIs**. For example:

> https://mrmin.auth0.com/login/callback

You do not need to specify an Authorized JavaScript origin.
