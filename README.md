<div align="center">
<img src="favicon/favicon.svg" alt="Stando Logo" width="120" height="120" />

# STANDO
**S**mart **T**ap **A**ttendance **N**etwork & **D**ata **O**rganiser

</div>

Stando keeps course attendance in one place. Lecturers record attendance by
tapping student cards against a phone, then review and manage the records.
Students can check their attendance and submit absence requests from their browser.

Part of [bredliplaku.com](https://bredliplaku.com).

## Using Stando

Sign in with your authorised Google account to see your courses and the tools
available to you. Contact an administrator if you need access.

| User | What you can do |
|---|---|
| Lecturers | Take attendance, manage student lists, correct records and review absence requests. |
| Students | View your attendance, register your card and request an excused absence with a supporting document. |
| Administrators | Manage staff access, assign courses and approve devices used for attendance. |

### Taking attendance

Choose a course and start scanning. Each card tap records the student's
attendance. You can search records by name, card, date or session to find an
entry or make a correction.

Card scanning uses NFC: it needs an NFC-capable Android phone, a supported
Chrome browser and an HTTPS website. You can view records without a card reader.

If the connection drops, pending attendance changes stay on that device.
Reconnect and check the sync status to make sure they have been saved online.

### Student lists and exports

Upload an Excel or CSV student list instead of entering everyone by hand.
Use **Import → Download template** for a starting file, or match the columns
in an existing spreadsheet. Review the preview before saving:

- **Merge** adds new students and updates those with a matching card ID or email.
- **Replace All** replaces the entire student list.

You can also download student lists as Excel files and export attendance
for backup or later import. For courses using EIS, **Add to EIS** helps
transfer attendance there.

<details>
<summary>Student import format</summary>

The template uses **Name**, **Card ID** and **Email**. Imports also accept older
**UID / Student ID** headings and an optional **Hardware UID** column.

Store card IDs as text to retain leading zeros; separate multiple IDs with
semicolons. Leave Hardware UID empty when it is unavailable. Each student needs
a name and either a card ID or email. Imports need an internet connection.

</details>

## Use Stando on another website

1. Sign in and click your name. Lecturers choose **My Courses → Download
   index.html**; administrators use **Settings → Courses**.
2. Upload the downloaded file as `index.html` to an HTTPS website folder,
   for example `https://example.com/attendance/`.
3. Ask the administrator to approve the website using the steps below.

This puts Stando on your website without having to maintain a separate copy.
Every visitor signs in with their own account and sees the courses they can
access. Routine app and attendance updates appear without another download.

## Administration

### Approve a new website

Once the updated Edge Functions are deployed, **adding a website requires
settings changes only. Neither function's `index.ts` needs editing.**

1. In the existing Supabase project, open **Authentication → URL Configuration
   → Redirect URLs**. Add the full page address, such as
   `https://example.com/attendance/`. Include
   `https://example.com/attendance/index.html` if visitors open that URL
   directly. Keep the existing Site URL.
2. Open **Edge Functions → Secrets**. Create or overwrite
   `STANDO_ALLOWED_ORIGINS` with the **complete list** of additional approved
   origins, including all previous entries and the new website. Click **Save**.

Example secret value:

```text
https://example.com,https://www.example.com,https://example.org,https://www.example.org
```

An origin includes `https://` and the domain, with no folder, quotes or
wildcards. Include both `www` and non-`www` in the relevant settings when
both are used.

**Secret values are hidden after saving.** Keep a separate record of the full
list and paste that whole list when updating it. Saving only the new domain
would replace the previous entries. Secret updates require no redeployment.

**Optional — Google One Tap:** to enable the automatic sign-in prompt, add the
website origin to **Authorized JavaScript origins** in the Google web client
matching `CLIENT_ID` in [js/scripts.js](js/scripts.js). The ordinary **Sign in**
button uses the Supabase redirect configured above.

Open the uploaded page and sign in after approval. Sessions, preferences and
device IDs are separate on each website, so trusted devices may need approval
again. A new lecturer on an already-approved website needs only account and
course assignments.

Reference: [Supabase redirects](https://supabase.com/docs/guides/auth/redirect-urls),
[secret settings](https://supabase.com/docs/guides/functions/secrets#production-secrets),
[Google origins](https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid).

## Developer notes

Stando uses HTML, CSS and JavaScript, Supabase for authentication and backend
services, and Google Identity Services for One Tap.

### Deploy application changes

Publish the application files together. For Edge Function code changes:

1. In **Supabase → Edge Functions → Functions**, open **kiosk-login**.
2. Select **Code → index.ts**, replace its contents with the complete
   [kiosk-login source](supabase/functions/kiosk-login/index.ts), and click
   **Deploy updates**.
3. Repeat for **send-email** using the complete
   [send-email source](supabase/functions/send-email/index.ts).

Each function is self-contained for dashboard editing. Keep the existing
authentication settings and secrets. Deploy these updated functions once when
setting up website downloads, then again only when their code changes.

CLI alternative:

```sh
supabase functions deploy kiosk-login
supabase functions deploy send-email
```

### Maintain existing uploads

- Keep the central address in [js/website.js](js/website.js), [embed.js](embed.js)
  and the application assets available. The loader needs cross-origin access
  to the central HTML; host security policies must permit the required assets
  and services.
- Application and data updates need no replacement download. Earlier downloads
  remain valid when another copy is generated.
- The downloaded HTML contains its initial theme styling and favicon link.
  Changes to those require replacing the uploaded file; the favicon comment
  identifies the setting.
- Only the central installation's origins are built into the Edge Functions.
  Manage all lecturer websites through `STANDO_ALLOWED_ORIGINS`; new websites
  require no edits to either function.
- Website approval and account permissions are separate. Removing a website
  from configuration does not revoke previously issued sessions.

## Contributing

Bug fixes and improvements are welcome through pull requests.

## License

MIT License. See [LICENSE](LICENSE).

<div align="center">
<small>© 2025-2026 Bredli Plaku. All Rights Reserved.</small>
</div>
