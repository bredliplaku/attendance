<div align="center">
<img src="favicon/favicon.svg?v=20260923" alt="Stando Logo" width="120" height="120" />

# STANDO
**S**mart **T**ap **A**ttendance **N**etwork & **D**ata **O**rganiser

</div>

## About

Stando replaces paper-based attendance with NFC. Students tap their ID cards on an Android phone and attendance is recorded instantly. No paper, no forged signatures, no manual data entry.

Scan data is pushed straight into official management systems, with auto-filled event numbers, topics, and submission-ready PDF reports.

Part of [bredliplaku.com](https://bredliplaku.com).

## Features

### For Lecturers
* **NFC scanning:** tap a student ID card on any NFC-enabled Android device to register attendance.
* **Audio feedback:** distinct sounds confirm scans without watching the screen.
* **Platform integration:** scripts auto-populate official management platforms with session data.
* **Offline mode:** import/export lets you track attendance without internet.
* **PDF reports:** generates reports matching required organisational templates.

### For Students
* **View records:** sign in with a Google Account to check personal attendance.
* **Request leave:** submit absence requests (health, emergencies, etc.) digitally.
* **Register ID cards:** add your own card via the mobile interface for approval.

## Tech Stack

* HTML5, JavaScript (ES6+), CSS3
* Chrome NFC API (WebNFC) for card reading
* Google OAuth for authentication
* Automated scripts to bridge scan data (Spreadsheets) → management platforms
* Optimised for Android + Chrome (WebNFC requirement)

## Getting Started

You need:
* An Android device with NFC
* Google Chrome
* A Google Account (Workspace or personal)

### Student list files

Student List exports Excel files with **Name**, **Card ID**, **Email**, and **Hardware UID** columns. The import template has **Name**, **Card ID**, and **Email**. Import also accepts CSV and older **Name / UID / Email** or **Student ID** headers. When both Card ID and Student ID are present, Card ID wins. Store card IDs as text to keep leading zeros; separate multiple IDs with semicolons. Leave Hardware UID empty when IT only provides card IDs and emails.

Use **Import → Download template** for a blank roster, or pick an existing file. Select its worksheet and header row (or turn headers off), then assign **Name**, **Card ID**, and **Email** columns. Recognized headers are suggested automatically and the preview updates as you change the mapping. Name plus at least one of Card ID or Email are required.

Hit **Continue** to review, then **Merge** (updates matching IDs/emails, keeps existing card IDs) or **Replace All** (replaces the whole list after confirmation). **Back** returns to column choices. Imports need internet and report success after saving.

## Contributing

Contributions welcome. Bug fixes, integration improvements, UI tweaks. Fork the repo and open a PR.

## The Team

* **Creator:** Bredli Plaku
* **Lead Developer:** Braian Plaku
* **Ambassador:** Eriselda Goga

## License

MIT License. See `LICENSE` for details.

<div align="center">
<small>© 2025-2026 Bredli Plaku. All Rights Reserved.</small>
</div>
