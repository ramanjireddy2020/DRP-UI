import "./App.css";

import DashBoard from "./components/DashBoard/DashBoard";
import HomePage from "./components/HomePage/HomePage";
import ProjectsPage from "./components/Projects/ProjectsPage";
import ProjectDetails from "./components/ProjectDetails/ProjectDetails";

import Login from "./components/Login/Login";
import SignUp from "./components/Login/SignUp";
import ForgotPassword from "./components/Login/ForgotPassword";
import ResetPassword from "./components/Login/ResetPassword";
import SplashScreen from "./components/SplashScreen";
import WelcomeScreen from "./components/WelcomeScreen";

import RecentSessionsPage from "./components/RecentSessions/RecentSessionsPage";

import NewResearchPage from "./components/NewResearch/NewResearchPage";
import CompleteWorkflow from "./components/NewResearch/CompleteWorkflow";

import ResearchLayout from "./components/ResearchLayout/ResearchLayout";
import MainLayout from "./components/Layout/MainLayout";
import RequireAuth from "./components/Auth/RequireAuth";

import {
  createBrowserRouter,
  RouterProvider,
  Navigate,
} from "react-router-dom";

import { CurrentUserProvider } from "./context/CurrentUserContext";


const router = createBrowserRouter([
  // =====================================================
  // ROOT
  // =====================================================
  {
    path: "/",
    element: <Navigate to="/login" replace />,
  },


  // =====================================================
  // AUTH / STARTUP
  // =====================================================
  {
    path: "/login",
    element: <Login />,
  },

  {
    path: "/signup",
    element: <SignUp />,
  },

  {
    path: "/forgot-password",
    element: <ForgotPassword />,
  },

  // Its own route, not a stage of /forgot-password, so a reset link in the
  // email can land straight on it with ?email=&code=.
  {
    path: "/reset-password",
    element: <ResetPassword />,
  },

  {
    path: "/splash",
    element: <SplashScreen />,
  },

  {
    path: "/welcome",
    element: <WelcomeScreen />,
  },


  // =====================================================
  // NEW RESEARCH
  // =====================================================
  {
    path: "/dashboard/new-research",
    element: (
      <RequireAuth>
        <ResearchLayout showHeader={false}>
          <NewResearchPage />
        </ResearchLayout>
      </RequireAuth>
    ),
  },

  {
    path: "/dashboard/new-research/workflow",
    element: (
      <RequireAuth>
        <CompleteWorkflow />
      </RequireAuth>
    ),
  },


  // =====================================================
  // MAIN DASHBOARD
  // =====================================================
  {
    path: "/dashboard",
    element: (
      <RequireAuth>
        <MainLayout />
      </RequireAuth>
    ),

    children: [

      // -------------------------------------------------
      // Dashboard Home
      // -------------------------------------------------
      {
        index: true,
        element: <HomePage />,
      },


      // -------------------------------------------------
      // Recent Sessions
      // -------------------------------------------------
      {
        path: "recent-sessions",
        element: <RecentSessionsPage />,
      },


      // -------------------------------------------------
      // Projects List
      // URL:
      // /dashboard/active-projects
      // -------------------------------------------------
      {
        path: "active-projects",
        element: <ProjectsPage />,
      },


      // -------------------------------------------------
      // Project Details
      // URL:
      // /dashboard/active-projects/rapamycin-for-neuro
      //
      // OR:
      // /dashboard/active-projects/type-2-diabetes
      // -------------------------------------------------
      {
        path: "active-projects/:projectId",
        element: <ProjectDetails />,
      },
    ],
  },


  // =====================================================
  // OLD DASHBOARD
  // =====================================================
  {
    path: "/dashboard-old",
    element: <DashBoard />,

    children: [
      {
        path: "active-projects/:projectId",
        element: <ProjectDetails />,
      },
    ],
  },
]);


function App() {
  return (
    // CurrentUserProvider wraps the router so every screen can read the
    // signed-in researcher's name. It replaces "Dr. Priya", which was
    // hardcoded in ~25 places across the five phase screens and the shell.
    <CurrentUserProvider>
      <RouterProvider router={router} />
    </CurrentUserProvider>
  );
}


export default App;