# Auth0 Integration

With Mozilla's Persona service [being sunsetted](https://developer.mozilla.org/en-US/Persona), the project's authentication needs were transitioned to the [Auth0](https://auth0.com/) service. Auth0 was chosen because it provides easy integration to many social accounts (Google, Microsoft, Github, Twitter, etc.) while also providing its own user/password database. Auth0 also allows for wildcard subdomain callback URLs, even for platforms that usually do not allow them (e.g. Google Auth).

The ClinGen curation interface currently supports Google and the user-password database login methods, with Slack notifications to the team on user signup, and custom E-mail templates.


## Auth0 setup

1. Navigate to the [Auth0 Management Dashboard](https://manage.auth0.com/)

2. Add a **New Client**

3. Specify a client name and select **Single Page Application** as the client type

4. Navigate to the **Settings** tab for the client and specify a comma-delimited list of **Allowed Callback URLs** for the client, including test URLs. For example:
> http://localhost:6543/callback, http://\*.instance.clinicalgenome.org/callback, https://\*.demo.clinicalgenome.org/callback, http://\*.production.clinicalgenome.org/callback, https://curation-test.clinicalgenome.org/callback, https://curation.clinicalgenome.org/callback

5. Navigate to the **Addons** and **Connections** tabs and enable the signup methods you want to allow. Even if you do not allow users to use the Username-Password-Authentication Database option, you should enable it to add the account for automated tests later.

6. Add any **Rules** you'd like (see the [Slack notification section](#slack-notification-section))

7. Modify the **Email Templates** -- it is recommended that the logo be replaced in the templates, along with the lines saying `please contact us by replying to this mail` as replying to the automated emails results in a failed mail delivery

8. Add test user accounts. ClinGen uses `clingen.test.curator` (for test curator and auto-logins) and `clingen.test.automated` (for automated tests)


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


## Slack notification setup

Note: do to the nature of the way the rule is built, the Slack notification is sent whenever a user with a login count of 0 logs in (this happens automatically on registration). This means that accounts that were manually added via the Auth0 Management Dashboard will still trigger a Slack notification on their first sign-in due to their login count being 0.

1. Navigate to the Slack [App Directory](https://clingenstanford.slack.com/apps/) then search for and/or select '**Incoming WebHooks**'

2. Press **Add Configuration**, select the channel you'd like the notifications to go to, then press the **Add Incoming WebHooks integration**

3. Configure the webhook as necessary, making note of the **Webhook URL**

4. Navigate to the [Auth0 Management Dashboard](https://manage.auth0.com/)'s **Rules** page

5. Press the **Create Rule** button, then select the **Slack Notification on User Signup** template in the **Webhook** section

6. Configure the rule as necessary, replacing the `SLACK_HOOK` variable with the Slack **Webhook URL** from above

	The rule ClinGen uses (with `SLACK_HOOK` replaced):

```javascript
function(user, context, callback) {
	// short-circuit if the user signed up already
	if (context.stats.loginsCount > 1) return callback(null, user, context);

	// get your slack's hook url from: https://slack.com/services/10525858050
	var SLACK_HOOK = 'CLINGEN_SLACK_WEBHOOK_GOES_HERE';

	var d = new Date(user.created_at);
	var slack = require('slack-notify')(SLACK_HOOK);
	var message = 'new user signup: *' + (user.user_metadata ? user.user_metadata.name : (user.name ? user.name : user.email)) + '* (' + user.email + ') at ' + d.toString();
	var channel = '#usersignup';

	slack.success({
		text: message,
		channel: channel
	});

	// don’t wait for the Slack API call to finish, return right away (the request will continue on the sandbox)`
	callback(null, user, context);
}
```


## Codebase setup

* In `/src/clincoded/auth0.py`, configure all lines commented with the `# AUTH0:` prefix (Client ID)

* In `/src/clincoded/static/components/mixins.js`, configure all lines commented with the `// AUTH0:` prefix (Client ID, Login Domain, Test Curator Credentials)

* In `/src/clincoded/tests/test_auth0.py`, configure all lines commented with the `# AUTH0:` prefix (Client ID, Login Domain, Automated Test Account Credentials)