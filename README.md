# School Management System

A comprehensive school management system with a beautiful dark blue themed admin panel.

## Features

- **Secure Authentication**: Admin signup and login with Firebase Authentication
- **Admin Verification**: Only users in the `admins` collection can access the system
- **Beautiful UI**: Dark blue theme with floating panels and smooth animations
- **Responsive Design**: Works perfectly on desktop and mobile devices
- **Dashboard**: Overview of all school statistics
- **Management Sections**:
  - Teachers Management
  - Students Management
  - Classes Management
  - Tasks Management (with expandable submenu)
    - Quizzes Management
    - Homeworks Management

## Tech Stack

### Backend
- NestJS
- Firebase Admin SDK
- TypeScript
- Class Validator

### Frontend
- React 19
- TypeScript
- React Router DOM
- Axios
- Vite

## Setup Instructions

### Backend Setup

1. Navigate to the backend folder:
   ```bash
   cd school_backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. The `.env` file is already configured with Firebase credentials

4. Start the development server:
   ```bash
   npm run start:dev
   ```

   The backend will run on `http://localhost:3000`

### Frontend Setup

1. Navigate to the frontend folder:
   ```bash
   cd school__admin
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. The `.env` file is already configured with the backend URL

4. Start the development server:
   ```bash
   npm run dev
   ```

   The frontend will run on `http://localhost:5173`

## Usage

1. **Sign Up**: Create a new admin account at `/signup`
   - The admin will be created in Firebase Authentication
   - The admin data will be saved in the `admins` collection in Firestore

2. **Sign In**: Login with your admin credentials at `/login`
   - The system verifies that the user exists in the `admins` collection
   - Only verified admins can access the dashboard

3. **Dashboard**: After login, you'll be redirected to the dashboard
   - View overview statistics
   - Use the sidebar to navigate between different management sections
   - The sidebar is collapsible for better screen space
   - Click on "Tasks Management" to expand and see Quizzes and Homeworks

## Security Features

- All API calls go through the backend (no direct Firebase calls from frontend)
- Environment variables are used for sensitive data
- JWT token verification for authenticated requests
- Protected routes on both frontend and backend
- Admin verification on every protected route

## API Endpoints

### Authentication
- `POST /auth/signup` - Register a new admin
- `POST /auth/login` - Login an existing admin
- `GET /auth/verify` - Verify admin token

## Project Structure

```
school_backend/
├── src/
│   ├── auth/           # Authentication module
│   ├── firebase/       # Firebase configuration
│   └── main.ts         # Application entry point
└── .env                # Environment variables

school__admin/
├── src/
│   ├── components/     # Reusable components
│   ├── context/        # React context (Auth)
│   ├── pages/          # All page components
│   ├── services/       # API service
│   └── App.tsx         # Main app component
└── .env                # Environment variables
```

## Design Features

- **Floating Shapes Animation**: Beautiful animated background shapes
- **Smooth Transitions**: All interactions have smooth animations
- **Dark Blue Theme**: Professional and eye-friendly color scheme
- **Glassmorphism**: Modern blur effects on cards and panels
- **Responsive Sidebar**: Collapsible sidebar with smooth transitions
- **Status Badges**: Color-coded status indicators
- **Hover Effects**: Interactive elements with smooth hover states

## Notes

- The service account JSON file is included for development purposes
- In production, use environment variables for all sensitive data
- The system is fully prepared for adding business logic to the management pages
- All pages are created with UI/UX in mind but without backend logic (as requested)

## Next Steps

To add functionality to the management pages:
1. Create backend controllers for teachers, students, classes, quizzes, and homeworks
2. Add Firestore collections for each entity
3. Implement CRUD operations in the frontend
4. Add form modals for creating/editing records
5. Implement data fetching and state management

## License

This project is for educational purposes.
