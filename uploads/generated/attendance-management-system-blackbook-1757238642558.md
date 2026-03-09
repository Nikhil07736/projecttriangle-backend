# Attendance Management System: Project Black Book

## 1. Abstract

This document serves as the technical documentation for the Attendance Management System (AMS), a web application built using React (frontend), Node.js (backend), Tailwind CSS (styling), and MySQL (database).  AMS aims to provide a streamlined and efficient solution for managing employee attendance, generating reports, and providing insightful data analysis. The system allows administrators to add/remove employees, track attendance records (including late arrivals and early departures), and generate various reports (e.g., daily, weekly, monthly attendance summaries).

## 2. Architecture

The AMS employs a three-tier architecture:

* **Presentation Tier (Frontend):**  Built using React and Tailwind CSS.  This tier handles user interaction, data display, and form submissions.  It interacts with the API layer to fetch and update data.

* **Application Tier (Backend):** Developed using Node.js and Express.js. This tier acts as an intermediary between the frontend and the database. It handles API requests, business logic, data validation, and authentication.

* **Data Tier (Database):** Uses MySQL to store persistent data, including employee information and attendance records.  A relational database schema is used to efficiently manage the data.

**Diagram:**

```
[Frontend (React + Tailwind)] --> [Backend (Node.js + Express)] --> [Database (MySQL)]
```

## 3. Setup & Installation

### 3.1 Prerequisites

* Node.js and npm (or yarn) installed.
* MySQL server running and configured.
* Git installed.

### 3.2 Cloning the Repository

```bash
git clone <repository_url>
```

### 3.3 Backend Setup

1. Navigate to the backend directory: `cd ams-backend`
2. Install dependencies: `npm install`
3. Create the MySQL database (e.g., `ams_db`) and import the schema (usually found in a file like `schema.sql`).
4. Configure the database credentials in the `.env` file (replace placeholders):
   ```
   DB_HOST=localhost
   DB_USER=your_db_user
   DB_PASSWORD=your_db_password
   DB_NAME=ams_db
   PORT=3001  // Or your preferred port
   ```
5. Start the backend server: `npm start`


### 3.4 Frontend Setup

1. Navigate to the frontend directory: `cd ams-frontend`
2. Install dependencies: `npm install`
3. Start the frontend development server: `npm start`

## 4. File Structure

```
ams-backend/
├── src/               // Backend source code
│   ├── controllers/   // API controllers
│   ├── models/       // Database models
│   ├── routes/       // API routes
│   ├── middleware/   // Middleware functions (e.g., authentication)
│   ├── app.js        // Main application file
│   └── ...
├── package.json       // Backend dependencies
└── ...

ams-frontend/
├── src/               // Frontend source code
│   ├── components/   // React components
│   ├── pages/        // React pages
│   ├── services/     // API interaction services
│   ├── styles/       // CSS files (Tailwind)
│   └── App.js        // Main application file
├── public/            // Static files
├── package.json       // Frontend dependencies
└── ...
```


## 5. Module Explanations

### 5.1 Backend Modules

* **`models/`**: Contains MySQL models defining the database schema (e.g., `Employee.js`, `Attendance.js`).
* **`controllers/`**: Handles API requests and business logic (e.g., `employeeController.js`, `attendanceController.js`).
* **`routes/`**: Defines API endpoints and their associated controllers (e.g., `employeeRoutes.js`, `attendanceRoutes.js`).
* **`middleware/`**: Contains middleware functions for authentication, authorization, and request validation (e.g., `authMiddleware.js`).


### 5.2 Frontend Modules

* **`components/`**: Reusable UI components (e.g., `EmployeeList.js`, `AttendanceForm.js`, `ReportTable.js`).
* **`pages/`**:  Pages of the application (e.g., `Dashboard.js`, `EmployeeManagement.js`, `Reports.js`).
* **`services/`**: Functions for interacting with the backend API (e.g., `employeeService.js`, `attendanceService.js`).


## 6. How to Run

1.  Ensure both the backend and frontend servers are running (steps in section 3).
2.  The frontend will automatically open in your browser (usually at `http://localhost:3000`).


## 7. Examples

### 7.1 Adding an Employee (Frontend):

The frontend will have a form to add new employees.  Fields include name, employee ID, department, etc.

### 7.2 Marking Attendance (Frontend):

Employees might clock in/out using a dedicated page or a button.  The frontend will send a request to the backend to update attendance records.

### 7.3 Generating Reports (Frontend):

The frontend will provide options to generate reports (daily, weekly, monthly).  Data will be fetched from the backend and displayed in a tabular format.


## 8. Future Work

* **Implement robust user authentication and authorization:**  Currently, placeholder authentication might be in place. This section needs to be fleshed out with detailed security measures.
* **Add features for generating customized reports:** Allow users to specify report parameters (date range, employee selection, etc.).
* **Integrate with other systems:** Integrate with payroll systems or HR databases.
* **Implement real-time attendance tracking:** Use WebSockets to provide real-time updates on attendance status.
* **Add a mobile application:** Develop a mobile app for employee self-service attendance tracking.
* **Improve UI/UX:**  Conduct usability testing and incorporate feedback to enhance user experience.
* **Data visualization:** Use charting libraries (e.g., Chart.js) to visualize attendance data.


This documentation provides a comprehensive overview of the Attendance Management System.  Further details on specific modules and functionalities can be found within the source code and comments.  Remember to replace placeholder values with your actual credentials and settings.
