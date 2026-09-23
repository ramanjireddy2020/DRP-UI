import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  confirmSignIn,
  getCurrentUser,
  signIn,
  signOut,
} from "@aws-amplify/auth";
import { useCurrentUser } from "../../context/CurrentUserContext";
import "./Login.css";

import molecularBg from "../assets/inovapath-loginbg.webp";
import inovapathLogo from "../assets/inovapath-logo.png";

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // CurrentUserProvider sits above the router and does not remount on
  // sign-in, so the profile (GET /users/me) is re-fetched explicitly here.
  const { refresh: refreshCurrentUser } = useCurrentUser();

  /**
   * "Your password has been reset. Sign in to continue." — handed over by the
   * reset and signup screens, which both finish here rather than signing the
   * user in themselves. Held in state so it clears the moment a sign-in is
   * attempted, instead of sitting there contradicting a later error.
   */
  const [notice, setNotice] = useState(location.state?.notice || "");

  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [requiresNewPassword, setRequiresNewPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  /**
   * Performs the actual Cognito sign-in.
   *
   * This is separated from handleSubmit so that we can
   * retry the sign-in after clearing a stale Amplify session.
   */
  const performSignIn = async (email, userPassword) => {
    const result = await signIn({
      username: email,
      password: userPassword,
    });

    const { isSignedIn, nextStep } = result;

    console.log("Sign-in result:", {
      isSignedIn,
      signInStep: nextStep?.signInStep,
    });

    if (isSignedIn) {
      refreshCurrentUser();
      navigate("/splash", { replace: true });
      return;
    }

    if (
      nextStep?.signInStep ===
      "CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED"
    ) {
      setRequiresNewPassword(true);
      return;
    }

    setError(
      `Additional sign-in step required: ${
        nextStep?.signInStep ?? "unknown"
      }`
    );
  };

  /**
   * Handles login.
   *
   * If Amplify still has an existing/stale authenticated user,
   * sign out first and then retry the login.
   */
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (isLoading) {
      return;
    }

    const email = username.trim();

    if (!email || !password) {
      setError("Please enter your email and password.");
      return;
    }

    setError("");
    setNotice("");
    setIsLoading(true);

    try {
      /*
       * Check whether Amplify already has an authenticated user.
       *
       * This is particularly important after:
       *
       * Login
       *   -> Change temporary password
       *   -> Splash
       *   -> Sign out
       *   -> Login again
       *
       * If a stale session remains, clear it before calling signIn().
       */
      try {
        const currentUser = await getCurrentUser();

        if (currentUser) {
          console.log(
            "Existing Amplify session detected:",
            currentUser.username
          );

          await signOut();

          console.log("Existing Amplify session cleared.");
        }
      } catch (sessionError) {
        /*
         * getCurrentUser() throws when there is no authenticated user.
         *
         * That is expected and means we can continue normally.
         */
        console.log("No existing authenticated session.");
      }

      /*
       * Now perform the actual login.
       */
      await performSignIn(email, password);
    } catch (err) {
      console.error("Sign-in error:", err);

      /*
       * This specifically handles:
       *
       * "There is already a signed in user."
       *
       * In case getCurrentUser() did not detect the stale session
       * but signIn() still reports it, clear the session and retry.
       */
      const errorMessage = err?.message?.toLowerCase() || "";
      const errorName = err?.name || "";

      const alreadySignedIn =
        errorName === "UserAlreadyAuthenticatedException" ||
        errorMessage.includes("already a signed in user") ||
        errorMessage.includes("already signed in") ||
        errorMessage.includes("user is already authenticated");

      if (alreadySignedIn) {
        console.warn(
          "Amplify reports an existing authenticated user. Clearing session and retrying..."
        );

        try {
          await signOut();

          /*
           * Give the Auth provider a moment to finish clearing
           * its local session state before retrying.
           */
          await new Promise((resolve) => setTimeout(resolve, 100));

          setError("");

          await performSignIn(email, password);

          return;
        } catch (retryError) {
          console.error(
            "Sign-in retry failed:",
            retryError
          );

          setError(
            retryError?.message ||
              "Unable to sign in after clearing the previous session. Please try again."
          );

          return;
        }
      }

      setError(
        err?.message ||
          "Unable to sign in. Please check your credentials and try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handles the Cognito new-password challenge.
   *
   * This is triggered when the user logs in with a temporary
   * password for the first time.
   */
  const handleNewPasswordSubmit = async (e) => {
    e.preventDefault();

    if (isLoading) {
      return;
    }

    setError("");

    const trimmedNewPassword = newPassword;
    const trimmedConfirmPassword = confirmPassword;

    if (!trimmedNewPassword || !trimmedConfirmPassword) {
      setError("Please enter and confirm your new password.");
      return;
    }

    if (trimmedNewPassword !== trimmedConfirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsLoading(true);

    try {
      console.log("Confirming new Cognito password...");

      const { isSignedIn, nextStep } = await confirmSignIn({
        challengeResponse: trimmedNewPassword,
      });

      console.log("Confirm sign-in result:", {
        isSignedIn,
        signInStep: nextStep?.signInStep,
      });

      if (isSignedIn) {
        /*
         * Password has been successfully changed and
         * the user is now authenticated.
         */
        setRequiresNewPassword(false);
        setNewPassword("");
        setConfirmPassword("");
        setPassword("");

        refreshCurrentUser();
        navigate("/splash", { replace: true });
      } else {
        setError(
          `Additional sign-in verification is required: ${
            nextStep?.signInStep ?? "unknown"
          }`
        );
      }
    } catch (err) {
      console.error("New password confirmation error:", err);

      setError(
        err?.message ||
          "Unable to set your new password. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Forgot password.
   *
   * Review point 4: this was an empty function, so the button was visible and
   * inert and a locked-out user had no way back into their account.
   */
  const handleForgotPassword = () => {
    navigate("/forgot-password");
  };

  return (
    <div className="login-page">
      {/* =====================================================
          ANIMATED MOLECULAR BACKGROUND
          ===================================================== */}

      <div
        className="molecular-background"
        style={{
          backgroundImage: `url(${molecularBg})`,
        }}
      />

      {/* Dark overlay */}
      <div className="background-overlay" />

      {/* =====================================================
          LEFT SIDE
          ===================================================== */}

      <section className="login-visual">
        <div className="visual-content">
          {/* Brand */}
          <div className="brand">
            <div className="logo-wrapper">
              <img
                src={inovapathLogo}
                alt="iNovaPath"
                className="brand-logo"
              />
            </div>

            <span className="brand-name">
              iNovaPath
            </span>
          </div>

          {/* Hero content */}
          <div className="hero-copy">
            <h1>
              Accelerated Drug
              <br />
              Discovery{" "}
              <span>with Gen AI</span>
            </h1>

            <p>
              An agentic AI platform to discover and validate
              existing drugs for new therapeutic indications.
            </p>
          </div>

          {/* Features */}
          <div className="feature-row">
            <Feature
              icon="⌬"
              title="AI-Powered Analysis"
              text="Gen AI powered Reasoning"
            />

            <Feature
              icon="〽"
              title="Real-time Insights"
            />

            <Feature
              icon="◉"
              title="Biomedical Knowledge"
            />
          </div>
        </div>
      </section>

      {/* =====================================================
          RIGHT SIDE LOGIN
          ===================================================== */}

      <section className="login-panel">
        <div className="login-container">
          {requiresNewPassword ? (
            <NewPasswordForm
              email={username}
              newPassword={newPassword}
              confirmPassword={confirmPassword}
              setNewPassword={setNewPassword}
              setConfirmPassword={setConfirmPassword}
              isLoading={isLoading}
              error={error}
              onSubmit={handleNewPasswordSubmit}
            />
          ) : (
            <>
              {/* Login Header */}
              <div className="login-header">
                <h2>Sign in to continue</h2>

                <p>
                  Enter your research credentials
                </p>
              </div>

              {/* Handed over by the reset and signup screens. */}
              {notice && (
                <p className="form-notice">{notice}</p>
              )}

              {/* Login Form */}
              <form
                onSubmit={handleSubmit}
                className="login-form"
              >
                {/* Email */}
                <div className="field">
                  <label htmlFor="email">
                    Email
                  </label>

                  <div className="input-wrapper">
                    <input
                      id="email"
                      type="email"
                      placeholder="Enter your email"
                      value={username}
                      onChange={(e) =>
                        setUsername(e.target.value)
                      }
                      autoComplete="email"
                      required
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="field">
                  <label htmlFor="password">
                    Password
                  </label>

                  <div className="input-wrapper">
                    <input
                      id="password"
                      type={
                        showPassword
                          ? "text"
                          : "password"
                      }
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) =>
                        setPassword(e.target.value)
                      }
                      autoComplete="current-password"
                      required
                    />

                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() =>
                        setShowPassword(
                          (previous) => !previous
                        )
                      }
                      aria-label={
                        showPassword
                          ? "Hide password"
                          : "Show password"
                      }
                    >
                      {showPassword ? (
                        <svg
                          viewBox="0 0 24 24"
                          aria-hidden="true"
                        >
                          <path d="M3 3l18 18" />

                          <path
                            d="M10.6 10.6a2 2 0 0 0 2.8 2.8"
                          />

                          <path
                            d="M9.9 4.3A10.7 10.7 0 0 1 12 4c7 0 10 8 10 8a17.5 17.5 0 0 1-3.1 4.6"
                          />

                          <path
                            d="M6.6 6.6C3.8 8.3 2 12 2 12s3 8 10 8a9.8 9.8 0 0 0 4.4-1"
                          />
                        </svg>
                      ) : (
                        <svg
                          viewBox="0 0 24 24"
                          aria-hidden="true"
                        >
                          <path
                            d="M2 12s3-8 10-8 10 8 10 8-3 8-10 8S2 12 2 12Z"
                          />

                          <circle
                            cx="12"
                            cy="12"
                            r="3"
                          />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                {/* Remember me + Forgot password */}
                <div className="remember-row">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                    />

                    <span className="custom-checkbox" />

                    Remember me
                  </label>

                  <button
                    type="button"
                    className="forgot-link"
                    onClick={handleForgotPassword}
                  >
                    Forgot password?
                  </button>
                </div>

                {/* Sign-in error */}
                {error && (
                  <p
                    className="form-error"
                    role="alert"
                  >
                    {error}
                  </p>
                )}

                {/* Login button */}
                <button
                  type="submit"
                  className={`login-button ${
                    isLoading ? "loading" : ""
                  }`}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <span className="spinner" />
                      Signing in...
                    </>
                  ) : (
                    "Sign In"
                  )}
                </button>

                {/* The way to the new signup screen — its own "Sign in" link
                    points back here. */}
                <div className="auth-switch">
                  <span>Don&apos;t have an account?</span>

                  <button
                    type="button"
                    onClick={() => navigate("/signup")}
                  >
                    Sign up
                  </button>
                </div>
              </form>
            </>
          )}
        </div>

        {/* =====================================================
            FOOTER
            ===================================================== */}

        <div className="login-footer">
          <div className="footer-links">
            <button type="button">
              Help Center
            </button>

            <button type="button">
              Privacy Policy
            </button>

            <button type="button">
              Terms of Service
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

/* =========================================================
   FEATURE COMPONENT
   ========================================================= */

const Feature = ({
  icon,
  title,
  text,
}) => {
  return (
    <div className="feature">
      <div className="feature-icon">
        {icon}
      </div>

      <div className="feature-content">
        <strong>{title}</strong>

        {/* Only the first tab carries a subtitle in the approved copy, so an
            absent `text` renders nothing rather than an empty line. */}
        {text ? <span>{text}</span> : null}
      </div>
    </div>
  );
};

/* =========================================================
   NEW PASSWORD COMPONENT
   ========================================================= */

const NewPasswordForm = ({
  email,
  newPassword,
  confirmPassword,
  setNewPassword,
  setConfirmPassword,
  isLoading,
  error,
  onSubmit,
}) => {
  return (
    <>
      <div className="login-header">
        <h2>Set a new password</h2>

        <p>
          Create a new password to finish signing in as{" "}
          {email}.
        </p>
      </div>

      <form
        onSubmit={onSubmit}
        className="login-form"
      >
        {/* New Password */}
        <div className="field">
          <label htmlFor="new-password">
            New password
          </label>

          <div className="input-wrapper">
            <input
              id="new-password"
              type="password"
              placeholder="Enter your new password"
              value={newPassword}
              onChange={(e) =>
                setNewPassword(e.target.value)
              }
              autoComplete="new-password"
              required
            />
          </div>
        </div>

        {/* Confirm Password */}
        <div className="field">
          <label htmlFor="confirm-password">
            Confirm new password
          </label>

          <div className="input-wrapper">
            <input
              id="confirm-password"
              type="password"
              placeholder="Re-enter your new password"
              value={confirmPassword}
              onChange={(e) =>
                setConfirmPassword(e.target.value)
              }
              autoComplete="new-password"
              required
            />
          </div>
        </div>

        {/* Error */}
        {error && (
          <p
            className="form-error"
            role="alert"
          >
            {error}
          </p>
        )}

        {/* Update Password */}
        <button
          type="submit"
          className={`login-button ${
            isLoading ? "loading" : ""
          }`}
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <span className="spinner" />
              Updating password...
            </>
          ) : (
            "Update Password"
          )}
        </button>
      </form>
    </>
  );
};

export default Login;