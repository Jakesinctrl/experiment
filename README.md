# 🏥 MIMS — Medical Information Management System

A full-stack school clinic system built with **Node.js + Express + SQLite**.

---

## 📁 Folder Structure

```
mims/
├── server.js         
├── database.js      
├── package.json      
├── mims.db      
└── public/
    ├── index.html    
    ├── student.html  
    ├── admin.html
    ├── css/
    │   └── style.css  
    └── js/
        ├── index.js   
        ├── student.js 
        └── admin.js 
```

## ✨ Features

### Landing Page
- Sticky navigation (Services, Announcements, Login)
- Auto-advancing image slideshow (8-second interval)
- About Clinic section with clinic info
- Clinic Services section (6 service cards)
- Announcements preview
- Login modal with Student/Admin tabs

### Student Portal
- **My Appointments** — Search by name to view appointment status
- **Request Appointment** — Form to submit to admin inbox
- **Announcements** — View clinic notices
- **Comment** — Submit anonymous feedback to admin

### Admin Portal
- **Patient** — Grid of patient cards with stats, search, add/edit/delete (up to 50)
- **Appointment** — Inbox with approve/reject buttons + pending badge
- **Waitlist** — Auto-populated with approved appointments
- **Record** — File manager UI to create/edit/delete medical note documents
- **Feedback** — List of student comments with delete option
