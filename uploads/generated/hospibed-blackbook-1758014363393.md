# HospiBed: Hospital Bed Management System - Project Black Book

**Version:** 1.0

**Date:** October 26, 2023

## Abstract

HospiBed is a web-based Hospital Bed Management System built using the MERN (MongoDB, Express.js, React, Node.js) stack.  It aims to streamline the process of tracking and managing hospital beds, improving efficiency and reducing administrative overhead.  The system allows administrators to view bed availability in real-time, assign beds to patients, track patient movements, and generate reports.  The system prioritizes ease of use and data security.

## 1. Architecture

HospiBed employs a classic client-server architecture.

* **Frontend (Client):** A React application responsible for the user interface (UI) and user interaction.  It communicates with the backend API via RESTful requests.
* **Backend (Server):** An Express.js server handling API requests, database interactions (MongoDB), and business logic.
* **Database:** MongoDB NoSQL database stores patient information, bed details, and system configurations.

![Architecture Diagram](architecture_diagram.png)  *(Replace with an actual diagram)*

The diagram above illustrates the flow of information between the client, server, and database.  For example, when a nurse assigns a bed to a patient, the React frontend sends a request to the Express.js backend, which then updates the MongoDB database and sends a confirmation back to the client.


## 2. Setup & Installation

**Prerequisites:**

* Node.js and npm (or yarn) installed.
* MongoDB installed and running.

**Steps:**

1. **Clone the repository:**
   ```bash
   git clone <repository_url>
   ```

2. **Navigate to the project directory:**
   ```bash
   cd hospiBed
   ```

3. **Install backend dependencies:**
   ```bash
   cd server
   npm install
   ```

4. **Install frontend dependencies:**
   ```bash
   cd ../client
   npm install
   ```

5. **Set environment variables:** Create a `.env` file in both the `server` and `client` directories (if needed, refer to `.env.example`).  This should include things like database connection strings, API keys, and other sensitive information.  **Do not commit `.env` files to version control.**

6. **Start the MongoDB database:** Ensure your MongoDB instance is running.

7. **Start the backend server:**
   ```bash
   cd ../server
   npm start
   ```

8. **Start the frontend development server:**
   ```bash
   cd ../client
   npm start
   ```

The application will be accessible at `http://localhost:3000` (or the port specified in your configuration).


## 3. File Structure

```
hospiBed/
├── client/             // React frontend
│   ├── src/
│   │   ├── components/  // Reusable UI components
│   │   ├── pages/      // Application pages (e.g., login, dashboard)
│   │   ├── services/   // API interaction logic
│   │   └── ...
│   ├── public/
│   └── ...
├── server/             // Express.js backend
│   ├── routes/         // API routes
│   ├── models/         // MongoDB schemas
│   ├── controllers/    // API request handlers
│   ├── config/         // Configuration files
│   └── ...
├── package.json        // Project dependencies
├── .gitignore
└── ...
```


## 4. Module Explanations

**Backend (server):**

* **`models/`:** Contains Mongoose schemas defining the structure of data stored in MongoDB (e.g., `Bed.js`, `Patient.js`).
* **`routes/`:** Defines API endpoints using Express.js routers (e.g., `/beds`, `/patients`).
* **`controllers/`:** Handles requests to the API routes, interacts with the database, and performs business logic.
* **`services/` (Optional):** Can be used to abstract away database interactions for cleaner code.

**Frontend (client):**

* **`components/`:** Reusable UI components (buttons, forms, tables, etc.).
* **`pages/`:**  Components representing different application pages (Dashboard, Bed Management, Patient Management, Reports).
* **`services/`:** Handles communication with the backend API using `fetch` or `axios`.
* **`context/` (Optional):**  For managing application state using React Context API.


## 5. How to Run

Refer to the "Setup & Installation" section.


## 6. Examples

* **API Endpoint Example (GET all beds):**  `/api/beds` (returns a JSON array of bed objects).
* **UI Example:**  The application will have a dashboard displaying current bed availability, a section for assigning beds to patients, and a reporting module.  Screenshots or mockups should be included here. *(Add screenshots or mockups)*


## 7. Future Work

* **User authentication and authorization:** Implement robust user authentication and authorization using JWTs or similar.
* **Real-time updates:** Implement WebSockets or Server-Sent Events for real-time updates on bed availability.
* **Reporting and analytics:**  Enhance the reporting module to generate more detailed reports and analytics.
* **Integration with other hospital systems:**  Explore integration with existing hospital systems (e.g., Electronic Health Records).
* **Mobile application:** Develop a mobile application for easier access on the go.
* **Improved UI/UX:**  Further refine the user interface and user experience based on user feedback.


## Appendix

* **Technology Stack:** MERN (MongoDB, Express.js, React, Node.js)
* **Libraries and Frameworks:**  List all frontend and backend libraries used (e.g., React Router, Material-UI, Mongoose, Axios).
* **Database Schema:** Detailed descriptions of MongoDB schemas.
* **API Documentation:** Swagger or Postman documentation for the backend API.


This document serves as a starting point and will be updated as the project evolves.  Remember to replace placeholder content with actual information and diagrams.
