# WhatsApp number form

The form sends submitted phone numbers by email through a Vercel serverless
function using Gmail SMTP. The visitor can also choose to open WhatsApp.

## Deploy to Vercel

1. Revoke any Gmail app password that has been shared, then create a new one
   at <https://myaccount.google.com/apppasswords>. Google requires 2-Step
   Verification; availability depends on the account.
2. Import this repository into Vercel. Use the default settings for a project
   without a framework and deploy with Node.js 20 or later.
3. In the Vercel project settings, add these environment variables for the
   deployment environment:
   - `SMTP_USER`: the Gmail address that will send the email.
   - `SMTP_PASSWORD`: the new Gmail app password, not the normal account password.
   - `EMAIL_TO`: the email address that should receive the phone numbers.
4. Redeploy after setting or changing environment variables. Never commit the
   app password or put it in `index.html`. The Git-ignored `.env.local` file
   is for local settings and is not automatically uploaded when you deploy
   from Git; add the values in Vercel's project settings.
5. In `index.html`, update `CONFIG.hisName` and set `CONFIG.whatsappNumber` to
   your actual WhatsApp number, including the country code and digits only
   (no leading zero, `+`, or spaces). The WhatsApp chat links stay unavailable
   while the example number is unchanged. The visitor can open a blank chat
   without submitting the form or after sending their number by email. Deploy
   the configuration change.
6. Open the deployed site, submit a test number, and check the recipient's
   inbox. The success screen appears only when Gmail accepts the email; check
   spam if it does not arrive.

The email endpoint is public, so an internet user can submit numbers to it.
Configure suitable Vercel WAF rate limiting or other abuse protection before
sharing the site widely. The number is also saved in the visitor's browser
after a successful submission. Opening `index.html` directly does not run
the serverless endpoint.

Run `npm install` and `npm test` to run the automated tests.
