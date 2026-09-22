import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { signUp, confirmSignUp, resendSignUpCode } from "@aws-amplify/auth";
import AuthShell from "./AuthShell";
import { EyeIcon, EyeOffIcon, EnvelopeIcon } from "./authIcons";
import "./Login.css";

/**
 * Account creation — the "Create an account" design.
 *
 * Review point 4. There was no signup screen at all; accounts were made in the
 * Cognito console and handed out with a temporary password, which is why the
 * sign-in screen still carries a CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED
 * branch.
 *
 * IMPORTANT — this only works if self-registration is enabled on the Cognito
 * app client. A pool set to admin-create-only rejects signUp() with
 * NotAuthorizedException, which is reported here as exactly that rather than
 * as something the visitor could fix by trying again.
 *
 * The design shows one screen. Cognito needs two: signUp() creates the account
 * and emails a code, confirmSignUp() verifies it. The second stage reuses the
 * "Check your email" layout from the reset design rather than inventing a
 * third look.
 */

const friendlyError = (error, fallback) => {
  switch (error?.name) {
    case "UsernameExistsException":
      return "An account already exists for that email. Try signing in instead.";
    case "InvalidPasswordException":
      return error.message || "That password does not meet the password policy.";
    case "CodeMismatchException":
      return "That code is not right. Check the email and try again.";
    case "ExpiredCodeException":
      return "That code has expired. Request a new one.";
    case "LimitExceededException":
    case "TooManyRequestsException":
      return "Too many attempts. Wait a few minutes and try again.";
    case "NotAuthorizedException":
      // The pool is admin-create-only. Nothing the visitor does will help, so
      // say so plainly instead of inviting a retry that cannot work.
      return "Self-registration is not enabled for this platform. Ask your administrator for an account.";
    default:
      return error?.message || fallback;
  }
};

const SignUp = () => {
  const navigate = useNavigate();

  // "details" — the designed form. "confirm" — the emailed code.
  const [stage, setStage] = useState("details");

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreed, setAgreed] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [code, setCode] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  /* =========================================================
     STAGE 1 — create the account
     ========================================================= */

  const handleSignUp = async (event) => {
    event.preventDefault();
    if (isLoading) return;

    const address = email.trim();
    const name = fullName.trim();

    if (!name) {
      setError("Enter your full name.");
      return;
    }

    if (!address) {
      setError("Enter your email address.");
      return;
    }

    if (password !== confirmPassword) {
      setError("The two passwords do not match.");
      return;
    }

    if (!agreed) {
      setError("Please accept the Terms of Service and Privacy Policy.");
      return;
    }

    setError("");
    setNotice("");
    setIsLoading(true);

    try {
      const { isSignUpComplete, nextStep } = await signUp({
        username: address,
        password,
        options: {
          // `name` backs the researcher's display name across the app — the
          // value CurrentUserContext reads back from GET /users/me.
          userAttributes: { email: address, name },
        },
      });

      if (isSignUpComplete) {
        navigate("/login", {
          replace: true,
          state: { notice: "Your account is ready. Sign in to continue." },
        });
        return;
      }

      if (nextStep?.signUpStep === "CONFIRM_SIGN_UP") {
        setStage("confirm");
        setNotice(`We sent a verification code to ${address}.`);
        return;
      }

      // Any other step is a pool configuration this screen was not built for.
      // Naming it beats a spinner that never resolves.
      setError(
        `This account needs a step the app does not handle yet: ${
          nextStep?.signUpStep ?? "unknown"
        }.`
      );
    } catch (err) {
      setError(friendlyError(err, "The account could not be created. Try again."));
    } finally {
      setIsLoading(false);
    }
  };

  /* =========================================================
     STAGE 2 — verify the email
     ========================================================= */

  const handleConfirm = async (event) => {
    event.preventDefault();
    if (isLoading) return;

    if (!code.trim()) {
      setError("Enter the verification code from your email.");
      return;
    }

    setError("");
    setNotice("");
    setIsLoading(true);

    try {
      await confirmSignUp({
        username: email.trim(),
        confirmationCode: code.trim(),
      });

      navigate("/login", {
        replace: true,
        state: { notice: "Your account is confirmed. Sign in to continue." },
      });
    } catch (err) {
      setError(friendlyError(err, "The account could not be confirmed. Try again."));
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (isLoading) return;

    setError("");
    setNotice("");
    setIsLoading(true);

    try {
      await resendSignUpCode({ username: email.trim() });
      setNotice("A new code is on its way.");
    } catch (err) {
      setError(friendlyError(err, "The code could not be resent. Try again."));
    } finally {
      setIsLoading(false);
    }
  };

  /* =========================================================
     STAGE 2 VIEW
     ========================================================= */

  if (stage === "confirm") {
    return (
      <AuthShell>
        <div className="login-header">
          <h2>Check your email</h2>

          <p>
            We&apos;ve sent a verification code to {email.trim()}. Enter it
            below to finish creating your account.
          </p>
        </div>

        <div className="check-email-art" aria-hidden="true">
          <EnvelopeIcon />
        </div>

        <form onSubmit={handleConfirm} className="login-form">
          {notice && <p className="form-notice">{notice}</p>}

          <div className="field">
            <label htmlFor="signup-code">Verification Code</label>

            <div className="input-wrapper">
              <input
                id="signup-code"
                type="text"
                inputMode="numeric"
                placeholder="Enter the 6-digit code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                autoComplete="one-time-code"
                required
              />
            </div>
          </div>

          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            className={`login-button ${isLoading ? "loading" : ""}`}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <span className="spinner" />
                Verifying...
              </>
            ) : (
              "Verify and continue"
            )}
          </button>

          <div className="auth-switch">
            <span>Didn&apos;t receive the email?</span>

            <button type="button" onClick={handleResend} disabled={isLoading}>
              Resend
            </button>
          </div>

          <div className="auth-switch">
            <button type="button" onClick={() => navigate("/login")}>
              Back to sign in
            </button>
          </div>
        </form>
      </AuthShell>
    );
  }

  /* =========================================================
     STAGE 1 VIEW — the design
     ========================================================= */

  return (
    <AuthShell>
      <div className="login-header">
        <h2>Create an account</h2>

        <p>Start your research journey</p>
      </div>

      <form onSubmit={handleSignUp} className="login-form">
        {/* Full name */}
        <div className="field">
          <label htmlFor="signup-name">Full Name</label>

          <div className="input-wrapper">
            <input
              id="signup-name"
              type="text"
              placeholder="e.g. Dr. Priya Sharma"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              autoComplete="name"
              required
            />
          </div>
        </div>

        {/* Email */}
        <div className="field">
          <label htmlFor="signup-email">Email Address</label>

          <div className="input-wrapper">
            <input
              id="signup-email"
              type="email"
              placeholder="e.g. researcher@drp.inst"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>
        </div>

        {/* Password */}
        <div className="field">
          <label htmlFor="signup-password">Password</label>

          <div className="input-wrapper">
            <input
              id="signup-password"
              type={showPassword ? "text" : "password"}
              placeholder="Create a password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              required
            />

            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowPassword((previous) => !previous)}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          </div>
        </div>

        {/* Confirm password */}
        <div className="field">
          <label htmlFor="signup-confirm">Confirm Password</label>

          <div className="input-wrapper">
            <input
              id="signup-confirm"
              type={showConfirm ? "text" : "password"}
              placeholder="Re-enter your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              required
            />

            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowConfirm((previous) => !previous)}
              aria-label={showConfirm ? "Hide password" : "Show password"}
            >
              {showConfirm ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          </div>
        </div>

        {/* Terms.

            The two names are styled as links in the design but are plain text
            here: the Terms and Privacy pages do not exist yet, and they are
            still waiting on the point-4 content decision. A clickable link
            that goes nowhere is the exact defect these screens were added to
            remove, so they become anchors the moment there is somewhere to
            send people. */}
        <label className="terms-row checkbox-label">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
          />

          <span className="custom-checkbox" />

          <span>
            I agree to the <span className="terms-link">Terms of Service</span>{" "}
            &amp; <span className="terms-link">Privacy Policy</span>
          </span>
        </label>

        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}

        {/* Not disabled while the box is unticked: the design shows this
            button solid, and a button that greys out with no explanation
            leaves people hunting for the reason. Submitting without the box
            ticked says so in the error line above instead. */}
        <button
          type="submit"
          className={`login-button ${isLoading ? "loading" : ""}`}
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <span className="spinner" />
              Creating account...
            </>
          ) : (
            "Sign Up"
          )}
        </button>

        <div className="auth-switch">
          <span>Already have an account?</span>

          <button type="button" onClick={() => navigate("/login")}>
            Sign in
          </button>
        </div>
      </form>
    </AuthShell>
  );
};

export default SignUp;
