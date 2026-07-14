# Swaraj FinancePro AI Platform
> **Enterprise Credit, Chit Funds, and LIC Policy Management Suite**

Swaraj FinancePro AI is an audit-ready, enterprise-grade financial management platform tailored for local credit lending institutions, chit mutual funds, and LIC policy agencies. Powered by predictive AI risk profiling, it provides real-time underwriting risk metrics, automated collections reminders, and structured report exports.

---

## 📸 Corporate Identity
The platform is branded under **Swaraj Private Limited** and utilizes the official corporate logo:
- **Motto:** *Trust. Growth. Together.*
- **Colors:** Sleek Navy, Slate Gray, and Amber Accents.

---

## 🛠️ Technology Stack
The application is structured as a decoupled monorepo containing three core components:

*   **Frontend:** [React](https://reactjs.org/) + [Vite](https://vitejs.dev/) + [TypeScript](https://www.typescriptlang.org/) + [TailwindCSS](https://tailwindcss.com/)
*   **Backend:** [Node.js](https://nodejs.org/) + [Express](https://expressjs.com/) + [TypeScript](https://www.typescriptlang.org/)
*   **Database ORM:** [Prisma Client](https://www.prisma.io/) + [PostgreSQL](https://www.postgresql.org/)
*   **Exports & Utilities:** [PDFKit](https://pdfkit.org/) (branded PDF builds), [ExcelJS](https://github.com/exceljs/exceljs) (xlsx sheets), [Nodemailer](https://nodemailer.com/) (HTML email notices)

---

## 🌟 Key Modules & Features

### 1. 🎡 Chit Funds Management
*   Enrolls subscribers in active chit pools and assigns member slots.
*   Conducts monthly bidding auctions (calculates discounts, company commissions, dividend distributions, and net installment dues).
*   Records payments and logs member collection schedules.

### 2. 💵 Credit Lending & Loans
*   Multi-stage loan pipeline: `APPLIED` ➔ `APPROVED` ➔ `DISBURSED` ➔ `CLOSED`.
*   **Collateral Verification Workflow:** Users upload collateral file links. Operators audit descriptions and document references to `VERIFY` or `REJECT` the asset. Sanctioning approval is locked until the collateral status is verified.
*   Generates amortization schedules (EMI installments with principal, interest, and automatic penalty calculations).

### 3. 🛡️ LIC Insurance Policies
*   Registers active plans under customer profiles (calculates premium dates based on MONTHLY, QUARTERLY, HALF_YEARLY, or YEARLY cycles).
*   Logs premium histories and computes agent commission allocations.
*   Automated notification alerts when policies are within 30 days of lapsing.

### 4. 🧠 Predictive AI Analytics
*   **Approval Estimator:** Predicts loan approvals based on monthly income, KYC state, and requested principal.
*   **Default Risk Profiler:** Scores active borrowers' default probabilities using overdue installments, debt ratios, and history.
*   **Credit Scoring:** Assigns an aggregate credit rating (Poor, Fair, Good, Excellent) using financial metrics.

### 5. 📧 Branded Communications & Reminders
*   Sends a **Next Due Email Notice** whenever a loan is disbursed, a chit auction is resolved, or an LIC policy is registered.
*   Dispatches HTML **Payment Receipts** instantly upon payment, alongside next due alerts.
*   **Overdue Dispatcher:** A single-click dashboard button scans the database for late EMIs, unpaid chits, or lapsed LICs and drafts email reminders containing penalty rates.

### 6. 📊 Report Export Center
*   Generates audit-ready spreadsheets, CSV tables, or structured branded PDFs.
*   **Unified Monthly Collections Audit:** Filters all loans, chits, and LIC records for a calendar period and lists users who have paid or are unpaid alongside summary totals.

---

## 🚀 Setup & Local Installation

### Prerequisites
*   Node.js (v18+)
*   PostgreSQL running locally on Port `5432`

### 1. Database Setup
Create a PostgreSQL database named `swaraj_financepro` and update the connection string in `backend/.env`:
```env
DATABASE_URL="postgresql://postgres:postgrespassword@localhost:5432/swaraj_financepro?schema=public"
JWT_SECRET="swaraj-super-secret-key-12345"
PORT=5000
```

### 2. Backend Initialization
```bash
cd backend
npm install
npx prisma db push
npx prisma db seed
npm run dev
```
*   *Note: The seed script populates sample customers, active loans, chits, and system settings. The server runs at `https://swaraj-backend-w769.onrender.com`.*

### 3. Frontend Initialization
```bash
cd ../frontend
npm install
npm run dev
```
*   *The Vite client runs at `https://swaraj-frontend-9nw2.onrender.com`. Access the admin dashboard or click portal in the layout to switch to the customer dashboard.*

---

## 🔒 Security & RBAC Layout
Access permissions are strictly enforced at the API controller layer:
*   `SUPER_ADMIN`, `ADMIN`, `STAFF`, `AGENT`: Access the reports, backoffice CRM, AI prediction logs, settings, and verification pipelines.
*   `CUSTOMER`: Access the Customer Portal to check active balances, request new loans, join chit pools, purchase LIC coverages, and pay outstanding installments.

---

## 📝 License
Proprietary software developed for Swaraj Private Limited. All rights reserved.
