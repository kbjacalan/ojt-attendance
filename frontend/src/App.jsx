import { Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/common/ProtectedRoute";
import GuestRoute from "./components/common/GuestRoute";
import RootRedirect from "./components/common/RootRedirect";
import Layout from "./components/common/Layout";
import Login from "./pages/auth/Login";
import Signup from "./pages/auth/Signup";
import Attendance from "./pages/student/Attendance";
import DTRView from "./pages/student/DTRView";
import AdminDashboard from "./pages/admin/Dashboard";
import AdminStudents from "./pages/admin/Students";
import AdminAgencies from "./pages/admin/Agencies";
import AdminHolidays from "./pages/admin/Holidays";
import AdminStaff from "./pages/admin/Staff";
import AdminAccount from "./pages/admin/Account";
import StudentRecords from "./pages/incharge/StudentRecords";
import StudentDTRReview from "./pages/incharge/StudentDTRReview";
import AdminStudentDTRReview from "./pages/admin/StudentDTRReview";

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<RootRedirect />} />

        <Route
          path="/login"
          element={
            <GuestRoute>
              <Login />
            </GuestRoute>
          }
        />

        <Route
          path="/signup"
          element={
            <GuestRoute>
              <Signup />
            </GuestRoute>
          }
        />

        {/*
          Every route nested here renders inside Layout, which shows the
          Navbar exactly once. Each child still wraps itself in
          ProtectedRoute since role requirements differ per page.
        */}
        <Route element={<Layout />}>
          <Route
            path="/attendance"
            element={
              <ProtectedRoute allowedRoles={["student"]}>
                <Attendance />
              </ProtectedRoute>
            }
          />

          <Route
            path="/dtr"
            element={
              <ProtectedRoute allowedRoles={["student"]}>
                <DTRView />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/students"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AdminStudents />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/agencies"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AdminAgencies />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/holidays"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AdminHolidays />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/staff"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AdminStaff />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/account"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AdminAccount />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/students/:studentId/dtr"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AdminStudentDTRReview />
              </ProtectedRoute>
            }
          />

          <Route
            path="/incharge/records"
            element={
              <ProtectedRoute allowedRoles={["in_charge"]}>
                <StudentRecords />
              </ProtectedRoute>
            }
          />

          <Route
            path="/incharge/students/:studentId/dtr"
            element={
              <ProtectedRoute allowedRoles={["in_charge"]}>
                <StudentDTRReview />
              </ProtectedRoute>
            }
          />

          {/*
            Add more protected routes here as you build them —
            they'll automatically get the Navbar via Layout.
          */}
        </Route>

        <Route path="*" element={<RootRedirect />} />
      </Routes>
    </AuthProvider>
  );
}

export default App;
