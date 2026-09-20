<div align="center">
<img src="favicon.png" alt="STANDO Logo" width="120" height="120" />

# STANDO
**S**mart **T**ap **A**ttendance **N**etwork & **D**ata **O**rganiser

Efficient. Reliable. Smart.

</div>

## 📖 About STANDO

STANDO is a personal project I developed to modernise and streamline attendance tracking, currently being applied actively within my courses. By leveraging existing infrastructure—specifically, NFC-enabled student ID cards—this digital initiative eliminates the inefficiencies and friction of traditional paper-based roll calls in the classroom.

Originally conceptualised to address environmental concerns (saving thousands of sheets of paper annually) and to ensure academic integrity (preventing signature forgery), the system has evolved into a highly practical daily tool. It automates the flow of data directly from the lecture room to official management systems, aligning perfectly with the vision of a sustainable, smart academic environment.

## ✨ Key Features

### 🎓 For Lecturers
* **NFC Smart Scanning:** Instantly register attendance by tapping participant ID cards using any NFC-enabled Android device.
* **Audio Feedback:** Distinct sound effects confirm successful scans without needing to constantly check the screen.
* **Platform Integration:** Automated scripting populates official management platforms with session data, including auto-filled event numbers and topics.
* **Offline Capability:** "Import/Export" functionality ensures attendance can be tracked and saved securely, even without an active internet connection.
* **Automated Reporting:** Generates digital PDFs that match required organisational templates for electronic submission.

### 🧑‍🎓 For Attendees
* **Transparency:** Students can sign in with their registered Google Account to view their personal attendance records for the course.
* **Permission Requests:** A built-in form allows participants to digitally request leave (documenting reasons like health or emergencies) without needing physical paperwork.
* **ID Registration:** Users can register their own ID cards directly via the mobile interface for approval.

## 🛠️ Technology Architecture

STANDO is built as a lightweight, web-based solution to ensure broad accessibility and ease of deployment in a live classroom setting.

* **Core Stack:** HTML5, JavaScript (ES6+), CSS3.
* **Hardware Interface:** Chrome NFC API (WebNFC) allows direct communication between the web application and NFC tags.
* **Authentication:** Integrated with Google OAuth (Workspace or standard accounts).
* **Data Management:** Automated scripts bridge the gap between raw scan data (Spreadsheets) and official management platforms.
* **Compatibility:** Optimised for Android devices running Google Chrome (due to WebNFC API support).

## 🚀 Getting Started

### Prerequisites
To use the scanning features of STANDO, you require:
* An Android device with NFC functionality.
* Google Chrome browser (support for WebNFC).
* A valid organisational or registered Google Account.

### Student list files

Student List exports Excel files with **Name**, **Card ID**, **Email**, and **Hardware UID** columns. The import template contains **Name**, **Card ID**, and **Email**. Import also accepts CSV files and older **Name / UID / Email** or **Student ID** headers. When a file has both Card ID and Student ID, Card ID is used. Store card IDs as text to preserve leading zeros; separate multiple IDs with semicolons. Leave Hardware UID empty when IT supplies only card IDs and emails.

Use **Import → Download template** for a blank roster, or choose an existing file. Select its worksheet, choose the header row (or turn off headers), and assign the **Name**, **Card ID**, and **Email** columns. Recognized headers are suggested automatically; the preview updates as you change the mapping. Name and at least one of Card ID or Email are required.

Select **Continue** to review the students, then **Merge** to update matching IDs or emails while keeping existing card IDs, or **Replace All** to replace the student list after confirmation. **Back** returns to your column choices. Student imports require an internet connection and report success after saving and reloading the list.

## 🤝 Contributing

Contributions are welcome from the community. Whether you are looking to fix a bug, enhance the integration scripts, or improve the UI, please feel free to fork the repository and submit a Pull Request.

## 👥 The Team

STANDO is proudly maintained and developed by our team:

* **Creator:** Bredli Plaku
* **Lead Developer:** Braian Plaku
* **Ambassador:** Eriselda Goga

## 📄 License

This project is open-source and available under the MIT License. See the `LICENSE` file for more details.

<div align="center">
<small>© 2025-2026 Bredli Plaku. All Rights Reserved.</small>
</div>
