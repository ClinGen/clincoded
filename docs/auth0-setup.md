# Auth0 Integration

With Mozilla's Persona service [being sunsetted](https://developer.mozilla.org/en-US/Persona), the project's authentication needs were transitioned to the [Auth0](https://auth0.com/) service. Auth0 was chosen because it provides easy integration to many social accounts (Google, Microsoft, Github, Twitter, etc.) while also providing its own user/password database. Auth0 also allows for wildcard subdomain callback URLs, even for platforms that usually do not allow them (e.g. Google Auth). ClinGen currently supports Google and the user-password database login methods.


## Auth0 setup

1. Navigate to the [Auth0 management dashboard](https://manage.auth0.com/)

2. Add a **New Client**

3. Specify a client name and select **Single Page Application** as the client type

4. Navigate to the **Settings** tab for the client and specify a comma-delimited list of **Allowed Callback URLs** for the client, including test URLs. For example:
> http://localhost:6543/callback, https://localhost:6543/callback, http://*.clinicalgenome.org/callback, https://*.clinicalgenome.org/callback, http://*.demo.clinicalgenome.org/callback, https://*.demo.clinicalgenome.org/callback, http://*.instance.clinicalgenome.org/callback, https://*.instance.clinicalgenome.org/callback

5. Navigate to the **Addons** and **Connections** tabs and enable the signup methods you want to allow. Even if you do not allow users to use the Username-Password-Authentication Database option, you should enable it to add the account for automated tests later.


## Google Auth setup

1. Navigate to the [Google APIs Developer's Console](https://console.developers.google.com/)

2. Navigate to the **Credentials** page and **Create a project**

3. Specify a project name and **Create** the project

4. Navigate to the **OAuth consent screen** tab and specify the necessary details

5. Navigate to the **Credentials** tab and **Create Credentials** for the project of the **OAuth Client ID** type

5. Select **Web application** for the Application type and give it a name

    1. Add the Auth0 source to the list of **Authorized JavaScript origins**

    2. Add the Auth0 redirect URI to the list of **Authorized redirect URIs**

6. Navigate to the **Library** page of the manager

7. Select the **Admin SDK** option, and **Enable** it

8. On the [Auth0 management dashboard](https://manage.auth0.com/), navigate to the **Connections** category's **Social** page

9. Enable the **Google** option, then click the **Google** button to open its settings

10. Add the Google **Client ID** and **Client Secret** and **Save** them
