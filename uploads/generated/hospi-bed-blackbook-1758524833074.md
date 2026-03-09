# Hospi-Bed: Project Black Book

## 1. Abstract

Hospi-Bed is a web application designed to manage hospital bed occupancy and patient information. Built using the MERN stack (MongoDB, Express.js, React, Node.js), it provides a user-friendly interface for hospital staff to track bed availability, assign patients to beds, view patient details, and generate reports. This document details the technical aspects of the application, including architecture, setup, file structure, module explanations, and future development plans.


## 2. Architecture

Hospi-Bed employs a classic three-tier architecture:

* **Presentation Tier (Frontend):**  Built using React.js, this tier handles user interaction, data display, and form submissions.  It consumes RESTful APIs exposed by the backend.
* **Application Tier (Backend):**  Developed with Node.js and Express.js, this tier handles API requests, business logic, data validation, and database interactions.
* **Data Tier (Database):** MongoDB is used as the NoSQL database to store patient information, bed details, and occupancy status.


![Hospi-Bed Architecture Diagram](architecture_diagram.png)  *(Replace with actual diagram)*


## 3. Setup & Installation

**Prerequisites:**

* Node.js and npm (or yarn) installed.
* MongoDB database running locally or remotely.  Note the connection string.

**Steps:**

1. **Clone the repository:**
   ```bash
   git clone <repository_url>
   ```

2. **Navigate to the project directory:**
   ```bash
   cd hospi-bed
   ```

3. **Install dependencies:**
   ```bash
   cd client  && npm install
   cd ../server && npm install
   ```

4. **Configure environment variables:** Create a `.env` file in both the `client` and `server` directories.  Populate them with:
   * **`client/.env`**:  May include API base URL (if different from default)
   * **`server/.env`**:  Must include `MONGODB_URI` with your MongoDB connection string.  Example: `MONGODB_URI=mongodb://localhost:27017/hospi_bed_db`

5. **Start the development servers:**
   ```bash
   # In separate terminals:
   cd client && npm start
   cd ../server && npm run start
   ```


## 4. File Structure

```
hospi-bed/
├── client/             // React frontend
│   ├── src/
│   │   ├── components/  // Reusable UI components
│   │   ├── pages/      // Application pages (e.g., Dashboard, PatientList)
│   │   ├── services/   // API interaction services
│   │   ├── ...
│   ├── public/
│   ├── ...
├── server/             // Node.js/Express.js backend
│   ├── models/         // MongoDB schemas
│   ├── routes/         // API routes
│   ├── controllers/    // API request handlers
│   ├── ...
├── package.json        // Project dependencies
├── ...
```


## 5. Module Explanations

* **`server/models/Patient.js`:** Defines the Mongoose schema for patient data (name, ID, bed assignment, etc.).
* **`server/models/Bed.js`:** Defines the Mongoose schema for bed information (bed number, type, occupancy status).
* **`server/routes/patientRoutes.js`:** Handles API requests related to patient management (CRUD operations).
* **`server/controllers/patientController.js`:** Contains the logic to process patient-related requests.
* **`client/src/services/patientService.js`:**  Handles communication with the backend patient APIs.
* **`client/src/components/BedGrid.js`:**  A visual representation of bed occupancy status.


## 6. How to Run

The application is started by running `npm start` in both the `client` and `server` directories in separate terminal windows.  The frontend will be accessible at `http://localhost:3000` (or a specified port).


## 7. Examples

* **Adding a patient:**  The user interface will provide a form to enter patient details. Upon submission, the backend API creates a new patient document in MongoDB and updates bed occupancy accordingly.
* **Viewing bed occupancy:**  A dashboard displays a visual representation of available and occupied beds, allowing quick overview of hospital capacity.
* **Generating reports:**  The system allows for generating reports on bed occupancy rates, patient demographics, and other relevant statistics.


## 8. Future Work

* **User roles and permissions:** Implement different user roles (admin, nurse, doctor) with varying access levels.
* **Real-time updates:** Integrate a real-time system (e.g., Socket.IO) for immediate updates on bed occupancy changes.
* **Integration with hospital systems:**  Connect to existing hospital systems (e.g., EHR) for seamless data exchange.
* **Improved reporting and analytics:**  Enhance reporting capabilities with advanced analytics and visualizations.
* **Mobile app development:** Create a mobile application for easier access and data entry.
* **Security enhancements:** Implement robust security measures to protect sensitive patient data (e.g., encryption, authentication).


## 9. Appendix

* **Technology Stack:** MERN stack (MongoDB, Express.js, React, Node.js)
* **Testing:**  (Describe testing strategy and frameworks used)
* **Deployment:** (Describe deployment process and environment)
* **API Documentation:** (Link to API documentation if available)


This black book serves as a living document.  It will be updated as the Hospi-Bed application evolves.
