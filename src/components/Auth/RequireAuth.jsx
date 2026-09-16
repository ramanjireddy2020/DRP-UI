import React, { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { fetchAuthSession } from "@aws-amplify/auth";
import { Box, CircularProgress } from "@mui/material";

/**
 * Gate for authenticated routes.
 *
 * Without this, /dashboard/* rendered whether or not a session existed, and an
 * unauthenticated load fired every screen's requests at once — producing a wall
 * of 401s instead of a redirect. That gets worse the more endpoints are wired,
 * which is why the guard lands before the screen integration.
 */
const RequireAuth = ({ children }) => {
  const location = useLocation();
  const [state, setState] = useState("checking"); // checking | authed | anon

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      try {
        const { tokens } = await fetchAuthSession();
        // The ID token is what the API Gateway authorizer accepts, so its
        // presence — not merely a session object — is what counts as signed in.
        if (!cancelled) {
          setState(tokens?.idToken ? "authed" : "anon");
        }
      } catch (error) {
        if (!cancelled) setState("anon");
      }
    };

    check();
    return () => {
      cancelled = true;
    };
  }, [location.pathname]);

  if (state === "checking") {
    return (
      <Box
        sx={{
          height: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: "#F8FAFC",
        }}
      >
        <CircularProgress size={28} sx={{ color: "#00BCD4" }} />
      </Box>
    );
  }

  if (state === "anon") {
    // `from` lets the login screen send the user back where they were heading.
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return children;
};

export default RequireAuth;
