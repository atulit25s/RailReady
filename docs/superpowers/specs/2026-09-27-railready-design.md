# RailReady System Architecture & Specification Document
**Date:** 2026-09-27
**Project:** RailReady — Railway Locomotive Shed Management & Pre-Deployment Readiness Platform
**Status:** Approved for Implementation

---

## 1. Executive Summary
RailReady is a full-stack MERN (MongoDB, Express, React, Node.js) web application engineered as a high-density, professional railway operations management platform. It digitizes the full locomotive lifecycle within an operational shed: digital checklist inspections, defect logging & tracking, Kanban-based maintenance management, rule-based pre-deployment readiness evaluation, train service assignments, real-time alerting (Socket.IO), QR code verification, PDF report generation, and immutable audit logging.

*Academic Disclaimer:* RailReady is an operational workflow and record-management software system; it does not claim to provide real-world railway safety certification.

---

## 2. Core Architecture & Tech Stack

### 2.1 Backend (`server/`)
- **Runtime:** Node.js (ES Modules)
- **Framework:** Express.js with modular route/controller/service/model layering
- **Database:** MongoDB with Mongoose ODM
- **Authentication:** JSON Web Tokens (JWT) in HTTP headers / localStorage + bcryptjs password hashing
- **Role-Based Access Control (RBAC):** `technician`, `supervisor`, `manager`, `admin`
- **Real-Time Communication:** Socket.IO for live notification broadcasts & operational status updates
- **File Uploads:** Multer with local disk storage in `server/uploads/`
- **Utilities:** PDFKit / html-pdf for dynamic PDF report generation, QRCode generator, Express-Validator

### 2.2 Frontend (`client/`)
- **Core:** React 18 / 19 with Vite
- **Routing:** React Router v6
- **Styling & Icons:** Tailwind CSS (Dark/Light mode, high-density operations palette), Lucide React
- **Data Visualization:** Recharts (KPI trends, Fleet Status Donut, Defect Categories Bar, Inspection volume)
- **Networking & Real-Time:** Axios with JWT interceptors, Socket.IO Client
- **Exporting & Print:** Print stylesheets, PDF downloads, CSV exports, QR code scanner/display

---

## 3. Database Schema Design (Mongoose Models)

1. **User:** `name`, `email`, `password`, `role`, `shed`, `phone`, `isActive`, `lastLogin`
2. **Locomotive:** `locoNumber` (unique), `locoClass` (WAP-7, WAG-9, WAP-5, WDG-4, etc.), `shed`, `manufacturer`, `commissioningDate`, `status` (`READY`, `INSPECTION_PENDING`, `UNDER_MAINTENANCE`, `AWAITING_REVIEW`, `REQUIRES_ATTENTION`, `OUT_OF_SERVICE`), `currentLocation`, `lastInspectionDate`, `nextInspectionDate`, `lastMaintenanceDate`, `mileageKm`, `notes`, `qrCode`
3. **InspectionTemplate:** `title`, `version`, `categories` (`Mechanical`, `Electrical`, `Safety`, `Cab`), `items`
4. **Inspection:** `inspectionNumber`, `locomotive` (ref), `inspector` (ref), `supervisor` (ref), `status` (`PENDING`, `IN_PROGRESS`, `SUBMITTED`, `UNDER_REVIEW`, `APPROVED`, `REJECTED`), `items` (`[category, itemTitle, result, comment, photoUrl, timestamp]`), `supervisorFeedback`, `submittedAt`, `reviewedAt`
5. **Defect:** `defectNumber`, `locomotive` (ref), `inspection` (ref), `category`, `severity` (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`), `description`, `reportedBy` (ref), `assignedTo` (ref), `status` (`OPEN`, `ASSIGNED`, `IN_PROGRESS`, `WAITING_VERIFICATION`, `RESOLVED`, `CLOSED`), `photos`, `resolutionNotes`, `resolvedAt`, `verifiedBy` (ref), `verifiedAt`
6. **MaintenanceTask:** `taskNumber`, `locomotive` (ref), `defect` (ref), `title`, `category`, `description`, `assignedStaff` (ref), `priority` (`LOW`, `MEDIUM`, `HIGH`, `URGENT`), `status` (`PENDING`, `ASSIGNED`, `IN_PROGRESS`, `VERIFICATION_REQUIRED`, `COMPLETED`), `startDate`, `dueDate`, `completedDate`, `notes`, `attachments`, `verifiedBy` (ref)
7. **TrainService:** `serviceNumber`, `serviceName`, `origin`, `destination`, `scheduledDeparture`, `scheduledArrival`, `assignedLocomotive` (ref), `status` (`SCHEDULED`, `ASSIGNED`, `DEPARTED`, `CANCELLED`)
8. **Deployment:** `deploymentNumber`, `locomotive` (ref), `trainService` (ref), `departureDate`, `departureTime`, `readinessSnapshot`, `assignedBy` (ref), `status` (`CONFIRMED`, `DISPATCHED`, `COMPLETED`, `CANCELLED`), `notes`
9. **Notification:** `recipient` (ref), `title`, `message`, `type`, `link`, `isRead`, `createdAt`
10. **AuditLog:** `user` (ref), `action`, `entityType`, `entityId`, `description`, `ipAddress`, `metadata`, `timestamp`

---

## 4. End-to-End Workflow & Readiness Logic

1. **Readiness Evaluation Engine:**
   - Evaluates a Locomotive's live database state:
     * Has APPROVED inspection within valid maintenance window.
     * 0 Open or In-Progress CRITICAL defects.
     * 0 Open or In-Progress HIGH defects.
     * 0 Pending or In-Progress Urgent Maintenance tasks.
     * Has Supervisor verification signoff.
   - Result: `READY FOR ASSIGNMENT` or specific blocker list.
2. **Pre-Deployment Gate:**
   - When assigning a locomotive to a train service, RailReady runs a pre-check. If any blocker is found, it refuses assignment and lists the exact blocking defects/inspections.
3. **Audit Trail:**
   - Every mutation automatically writes an immutable record to `AuditLog`.
