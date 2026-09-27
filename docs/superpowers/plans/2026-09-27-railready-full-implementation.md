# RailReady Full-Stack MERN Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a complete, production-grade MERN web application for Railway Locomotive Shed Management & Pre-Deployment Readiness (RailReady) with digital inspections, defect tracking, Kanban maintenance, rule-based readiness calculation, deployment assignments, QR codes, PDF reports, Socket.IO real-time alerts, and comprehensive seeded demo data.

**Architecture:** Monorepo with `server/` (Node/Express API with Controller-Service-Model architecture, Socket.IO, Multer, PDFKit) and `client/` (React + Vite SPA with Tailwind CSS, Recharts, Lucide React icons, Axios, Socket.IO Client).

**Tech Stack:** Node.js, Express.js, MongoDB/Mongoose, JWT, bcryptjs, Multer, Socket.IO, React 19/18, Vite, Tailwind CSS, Recharts, Lucide React, Axios.

**Spec:** `docs/superpowers/specs/2026-09-27-railready-design.md`

## Global Constraints
- Academic project disclaimer clearly visible in footer/login/readiness pages.
- 100% database-backed metrics; zero hardcoded/fake dashboard numbers.
- Full Role-Based Access Control (`technician`, `supervisor`, `manager`, `admin`).
- Safe demo accounts seeded with easy 1-click switcher in the UI header.
- Clean ES Modules across both server and client.

## Review Focus
1. Invalid or missing JWT token on protected routes returns 401 with standard JSON error format.
2. Deployment assignment correctly rejects assignment when locomotive has unverified critical defects or unapproved inspections, listing exact blockers.
3. Inspection submission automatically logs defect entries when checklist items are marked FAIL.
4. Maintenance status transitions (PENDING -> IN_PROGRESS -> VERIFICATION_REQUIRED -> COMPLETED) enforce role permissions (only supervisor/manager can verify).
5. Seeder populates realistic, internally consistent relationships across all 10 collections.

---

### Task 1: Root Workspace & Backend Scaffolding
**Files:**
- Create: `package.json`
- Create: `server/package.json`
- Create: `server/config/db.js`
- Create: `server/middleware/errorHandler.js`
- Create: `server/utils/logger.js`
- Create: `server/server.js`
- Create: `.env.example`
- Create: `server/.env`

- [ ] **Step 1: Create package.json and server package.json**
- [ ] **Step 2: Configure database connection and Express app with CORS, JSON body parser, and error handler**
- [ ] **Step 3: Verify server boot and healthcheck endpoint (`GET /api/health`)**
- [ ] **Step 4: Commit**

---

### Task 2: Mongoose Database Models
**Files:**
- Create: `server/models/User.js`
- Create: `server/models/Locomotive.js`
- Create: `server/models/InspectionTemplate.js`
- Create: `server/models/Inspection.js`
- Create: `server/models/Defect.js`
- Create: `server/models/MaintenanceTask.js`
- Create: `server/models/TrainService.js`
- Create: `server/models/Deployment.js`
- Create: `server/models/Notification.js`
- Create: `server/models/AuditLog.js`

- [ ] **Step 1: Implement all 10 Mongoose schemas with proper indexes, enums, defaults, and timestamps**
- [ ] **Step 2: Add password hashing and comparison pre-save hooks on User model**
- [ ] **Step 3: Commit**

---

### Task 3: Authentication, RBAC & User Management API
**Files:**
- Create: `server/middleware/authMiddleware.js`
- Create: `server/controllers/authController.js`
- Create: `server/controllers/userController.js`
- Create: `server/routes/authRoutes.js`
- Create: `server/routes/userRoutes.js`
- Create: `server/services/auditService.js`

- [ ] **Step 1: Implement JWT generation, login, current user (`/me`), and change-password endpoints**
- [ ] **Step 2: Implement RBAC middleware (`protect`, `authorize('admin', 'manager', ...)`)**
- [ ] **Step 3: Implement User CRUD controller for Admin**
- [ ] **Step 4: Implement AuditService helper to record audit logs on key mutations**
- [ ] **Step 5: Commit**

---

### Task 4: Locomotive Fleet Management & QR Code API
**Files:**
- Create: `server/controllers/locomotiveController.js`
- Create: `server/routes/locomotiveRoutes.js`
- Create: `server/services/qrService.js`

- [ ] **Step 1: Implement Locomotive CRUD with filtering by class, status, shed, and text search**
- [ ] **Step 2: Implement QR code data generation endpoint (`GET /api/locomotives/:id/qr`)**
- [ ] **Step 3: Implement deep locomotive details endpoint aggregating inspections, defects, maintenance, and deployments**
- [ ] **Step 4: Commit**

---

### Task 5: Digital Inspection Engine & Checklist API
**Files:**
- Create: `server/controllers/inspectionController.js`
- Create: `server/routes/inspectionRoutes.js`
- Create: `server/controllers/templateController.js`
- Create: `server/routes/templateRoutes.js`

- [ ] **Step 1: Implement default inspection template endpoints**
- [ ] **Step 2: Implement inspection creation, auto-saving drafts (`IN_PROGRESS`), submission (`SUBMITTED`), and supervisor review (`APPROVED` / `REJECTED`)**
- [ ] **Step 3: Add automated defect generation trigger when items fail during inspection submission**
- [ ] **Step 4: Commit**

---

### Task 6: Defect Management & Verification API
**Files:**
- Create: `server/controllers/defectController.js`
- Create: `server/routes/defectRoutes.js`

- [ ] **Step 1: Implement defect creation, listing with severity/status filters, technician assignment, resolution, and supervisor verification**
- [ ] **Step 2: Emit socket notifications and record audit log on critical/high defect creation**
- [ ] **Step 3: Commit**

---

### Task 7: Maintenance Task & Kanban Workflow API
**Files:**
- Create: `server/controllers/maintenanceController.js`
- Create: `server/routes/maintenanceRoutes.js`

- [ ] **Step 1: Implement maintenance task CRUD, technician assignment, priority management**
- [ ] **Step 2: Implement status transitions (`PENDING` -> `ASSIGNED` -> `IN_PROGRESS` -> `VERIFICATION_REQUIRED` -> `COMPLETED`) with role enforcement**
- [ ] **Step 3: Commit**

---

### Task 8: Readiness Evaluation Engine & Train Deployment API
**Files:**
- Create: `server/services/readinessService.js`
- Create: `server/controllers/readinessController.js`
- Create: `server/routes/readinessRoutes.js`
- Create: `server/controllers/serviceController.js`
- Create: `server/routes/serviceRoutes.js`
- Create: `server/controllers/deploymentController.js`
- Create: `server/routes/deploymentRoutes.js`

- [ ] **Step 1: Implement rule-based locomotive readiness calculation service (checks inspection validity, 0 critical/high defects, completed maintenance, supervisor approval)**
- [ ] **Step 2: Implement Train Service CRUD (fictional trains e.g., Deccan Queen, Intercity Express)**
- [ ] **Step 3: Implement Deployment Assignment with Pre-check Validation Gate (blocks assignment if readiness rules fail)**
- [ ] **Step 4: Commit**

---

### Task 9: Analytics, PDF Reporting Engine & Audit Log API
**Files:**
- Create: `server/controllers/analyticsController.js`
- Create: `server/routes/analyticsRoutes.js`
- Create: `server/services/pdfReportService.js`
- Create: `server/controllers/reportController.js`
- Create: `server/routes/reportRoutes.js`
- Create: `server/controllers/auditController.js`
- Create: `server/routes/auditRoutes.js`

- [ ] **Step 1: Implement database aggregation pipelines for Dashboard KPIs, fleet status distribution, defect categories, maintenance throughput, and inspection trends**
- [ ] **Step 2: Implement PDF generation service using PDFKit for Inspection Reports, Defect Logs, Maintenance Summaries, and Locomotive History**
- [ ] **Step 3: Implement searchable Audit Log query endpoint for Admin**
- [ ] **Step 4: Commit**

---

### Task 10: Real-Time Notifications & Socket.IO Engine
**Files:**
- Create: `server/services/socketService.js`
- Create: `server/controllers/notificationController.js`
- Create: `server/routes/notificationRoutes.js`

- [ ] **Step 1: Initialize Socket.IO with CORS and authentication handshake**
- [ ] **Step 2: Implement Notification database storage and real-time broadcast helper**
- [ ] **Step 3: Implement Notification mark-as-read and clear endpoints**
- [ ] **Step 4: Commit**

---

### Task 11: Comprehensive Demo Database Seeder
**Files:**
- Create: `server/seed/seedData.js`
- Create: `server/seed/seeder.js`

- [ ] **Step 1: Create realistic, consistent seed data (8 users across all 4 roles, 42 locomotives, 50+ inspections, 30+ defects, 35+ maintenance tasks, 20+ train services, 25+ deployments, notifications, audit logs)**
- [ ] **Step 2: Implement CLI seed runner (`node server/seed/seeder.js --seed`, `--clear`)**
- [ ] **Step 3: Verify seed execution and relational integrity**
- [ ] **Step 4: Commit**

---

### Task 12: Backend Automated Tests
**Files:**
- Create: `server/tests/auth.test.js`
- Create: `server/tests/locomotive.test.js`
- Create: `server/tests/inspection.test.js`
- Create: `server/tests/readiness.test.js`

- [ ] **Step 1: Write integration tests for Authentication, Locomotive CRUD, Inspection workflow, and Readiness calculation**
- [ ] **Step 2: Run tests and ensure 100% pass rate**
- [ ] **Step 3: Commit**

---

### Task 13: Frontend Scaffolding, Tailwind & Core UI Components
**Files:**
- Create: `client/package.json`
- Create: `client/vite.config.js`
- Create: `client/tailwind.config.js`
- Create: `client/src/index.css`
- Create: `client/src/components/common/Navbar.jsx`
- Create: `client/src/components/common/Sidebar.jsx`
- Create: `client/src/components/common/StatCard.jsx`
- Create: `client/src/components/common/StatusBadge.jsx`
- Create: `client/src/components/common/DataTable.jsx`
- Create: `client/src/components/common/Modal.jsx`
- Create: `client/src/components/common/ConfirmDialog.jsx`
- Create: `client/src/components/common/QRModal.jsx`
- Create: `client/src/components/common/EmptyState.jsx`
- Create: `client/src/components/common/LoadingSpinner.jsx`

- [ ] **Step 1: Scaffolding Vite React app with Tailwind CSS and Lucide icons**
- [ ] **Step 2: Build reusable UI component suite with dark/light mode support**
- [ ] **Step 3: Commit**

---

### Task 14: Frontend Auth, State & Quick Role Switcher
**Files:**
- Create: `client/src/api/axios.js`
- Create: `client/src/context/AuthContext.jsx`
- Create: `client/src/context/ThemeContext.jsx`
- Create: `client/src/context/SocketContext.jsx`
- Create: `client/src/context/NotificationContext.jsx`
- Create: `client/src/components/auth/ProtectedRoute.jsx`
- Create: `client/src/components/auth/RoleSwitcher.jsx`
- Create: `client/src/pages/Login.jsx`
- Create: `client/src/pages/Profile.jsx`

- [ ] **Step 1: Implement Axios interceptors for JWT token injection and 401 redirection**
- [ ] **Step 2: Implement AuthContext with demo quick login and 1-click Role Switcher bar**
- [ ] **Step 3: Build Railway Operations Login screen and User Profile page**
- [ ] **Step 4: Commit**

---

### Task 15: Main Railway Operations Dashboard
**Files:**
- Create: `client/src/pages/Dashboard.jsx`
- Create: `client/src/components/dashboard/FleetStatusChart.jsx`
- Create: `client/src/components/dashboard/DefectCategoryChart.jsx`
- Create: `client/src/components/dashboard/InspectionTrendChart.jsx`
- Create: `client/src/components/dashboard/RecentActivityFeed.jsx`

- [ ] **Step 1: Build high-density operations dashboard with live KPI counters, Recharts charts, quick action buttons, and live activity feed**
- [ ] **Step 2: Connect to backend `/api/analytics/dashboard`**
- [ ] **Step 3: Commit**

---

### Task 16: Locomotive Fleet Management & 7-Tab Details Page
**Files:**
- Create: `client/src/pages/Locomotives.jsx`
- Create: `client/src/pages/LocomotiveDetail.jsx`
- Create: `client/src/components/locomotives/LocomotiveFormModal.jsx`
- Create: `client/src/components/locomotives/LocomotiveCard.jsx`
- Create: `client/src/components/locomotives/TimelineView.jsx`

- [ ] **Step 1: Implement Locomotive Fleet list with search, filters (class, status, shed), grid/table toggle, add modal, and QR preview**
- [ ] **Step 2: Implement Locomotive Details page with 7 tabs (`Overview`, `Inspections`, `Defects`, `Maintenance`, `Deployments`, `History Timeline`, `Documents & QR`)**
- [ ] **Step 3: Commit**

---

### Task 17: Interactive Digital Inspection System
**Files:**
- Create: `client/src/pages/Inspections.jsx`
- Create: `client/src/pages/InspectionNew.jsx`
- Create: `client/src/pages/InspectionDetail.jsx`
- Create: `client/src/components/inspections/InspectionChecklist.jsx`
- Create: `client/src/components/inspections/ReviewModal.jsx`

- [ ] **Step 1: Build Inspection list page with status filtering (Pending, In Progress, Submitted, Approved, Rejected)**
- [ ] **Step 2: Build interactive digital checklist wizard with categorized items (Mechanical, Electrical, Safety, Cab), PASS/FAIL/REQUIRES_ATTENTION toggles, photo uploads, and real-time progress meter**
- [ ] **Step 3: Build Inspection Details view with Supervisor Review & Approval/Rejection signoff**
- [ ] **Step 4: Commit**

---

### Task 18: Defect Tracker & Maintenance Kanban Board
**Files:**
- Create: `client/src/pages/Defects.jsx`
- Create: `client/src/components/defects/DefectFormModal.jsx`
- Create: `client/src/components/defects/DefectResolveModal.jsx`
- Create: `client/src/pages/Maintenance.jsx`
- Create: `client/src/components/maintenance/KanbanBoard.jsx`
- Create: `client/src/components/maintenance/MaintenanceTaskModal.jsx`

- [ ] **Step 1: Build Defect Management page with severity pills, assignment, resolution notes, and supervisor verification**
- [ ] **Step 2: Build Interactive Maintenance Kanban board with columns (`PENDING`, `IN_PROGRESS`, `VERIFICATION_REQUIRED`, `COMPLETED`), quick stage advance, and task creator**
- [ ] **Step 3: Commit**

---

### Task 19: Pre-Deployment Readiness Center & Train Deployments
**Files:**
- Create: `client/src/pages/ReadinessCenter.jsx`
- Create: `client/src/pages/Deployments.jsx`
- Create: `client/src/components/deployments/DeployModal.jsx`
- Create: `client/src/components/deployments/TrainServiceModal.jsx`

- [ ] **Step 1: Build Readiness Center displaying consolidated locomotive readiness cards with checklist indicators, defect blockers, and supervisor signoff indicators**
- [ ] **Step 2: Build Train Deployments module with train service catalog and pre-check assignment modal that strictly blocks unready locomotives**
- [ ] **Step 3: Commit**

---

### Task 20: Analytics Dashboard & PDF Reports UI
**Files:**
- Create: `client/src/pages/Analytics.jsx`
- Create: `client/src/pages/Reports.jsx`

- [ ] **Step 1: Build dedicated Analytics page with fleet utilization, MTTR, inspection volume, and defect distribution**
- [ ] **Step 2: Build Reports page with parameters selector (Date range, Locomotive, Category) and 1-click PDF download & in-browser preview**
- [ ] **Step 3: Commit**

---

### Task 21: Administration (Users, Audit Logs & System Settings)
**Files:**
- Create: `client/src/pages/admin/UserManagement.jsx`
- Create: `client/src/pages/admin/AuditLogs.jsx`
- Create: `client/src/pages/admin/SystemSettings.jsx`

- [ ] **Step 1: Build User Management table with user creation, role editing, and activation toggling**
- [ ] **Step 2: Build Searchable & filterable Audit Logs explorer with metadata diff view**
- [ ] **Step 3: Build System Settings page for shed parameters and inspection thresholds**
- [ ] **Step 4: Commit**

---

### Task 22: End-to-End Verification, Documentation & Final Polish
**Files:**
- Create: `README.md`
- Create: `docs/ARCHITECTURE.md`
- Create: `docs/API.md`
- Create: `docs/DATABASE.md`
- Create: `docs/SETUP.md`
- Create: `docs/DEMO.md`

- [ ] **Step 1: Execute complete end-to-end integration walkthrough (Inspection -> Defect -> Maintenance -> Verification -> Readiness -> Deployment)**
- [ ] **Step 2: Write complete, professional markdown documentation files**
- [ ] **Step 3: Verify zero console errors, clean responsive UI, and verified demo accounts**
- [ ] **Step 4: Final commit**
