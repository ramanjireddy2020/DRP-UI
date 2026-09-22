import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { resetPassword } from "@aws-amplify/auth";
import AuthShell from "./AuthShell";
import { EnvelopeIcon } from "./authIcons";
import "./Login.css";

/**
 * Password reset, part one: ask for the address, then the "Check your email"
 * screen from the design.
 *
 * Review point 4. "Forgot password?" on the sign-in screen called an empty
 * function with a commented-out navigate() inside it, so a locked-out user had
 * no route back to their account at all.
 *
 * ---------------------------------------------------------------------------
 * NOTE ON LINK vs CODE — worth reading before changing this screen.
 *
 * The design says a reset LINK is emailed. Cognito's resetPassword() sends a
 * six-digit CODE; there is no link unless a custom message Lambda trigger is
 * added to the user pool to build one. Until that exists, a screen that told
 * people to click a link would leave them holding a code and no link.
 *
 * So the layout is the designed one and the copy says code. ResetPassword.jsx
 * already reads `code` from the URL, so the day that Lambda lands and the
 * email carries a link to /reset-password?code=..., that screen matches the
 * design exactly and this copy is the only thing to change back.
 * ---------------------------------------------------------------------------
 */

const friendlyError = (error, fallback) => {
  switch (error?.name) {
    case "LimitExceededException":
    case "TooManyRequestsException":
      return "Too many attempts. Wait a few minutes and try again.";
    case "InvalidParameterException":
      return "That account cannot be reset from here. Ask your administrator.";
    default:
      return error?.message || fallback;
  }
};

const ForgotPassword = () => {
  const navigate = useNavigate();

  // "request" — the email form. "sent" — the designed confirmation.
  const [stage, setStage] = useState("request");

  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const send = async (address) => {
    await resetPassword({ username: address });
  };

  const handleRequest = async (event) => {
    event.preventDefault();
    if (isLoading) return;

    const address = email.trim();
    if (!address) {
      setError("Enter the email address on your account.");
      return;
    }

    setError("");
    setNotice("");
    setIsLoading(true);

    try {
      await send(address);
      setStage("sent");
    } catch (err) {
      /*
       * An address with no account throws UserNotFoundException. That is NOT
       * surfaced: telling an anonymous visitor which addresses have accounts
       * turns this form into a way to enumerate the user pool. The screen
       * advances exactly as it would for a real address.
       */
      if (err?.name === "UserNotFoundException") {
        setStage("sent");
      } else {
        setError(friendlyError(err, "The code could not be sent. Try again."));
      }
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
      await send(email.trim());
      setNotice("A new code is on its way.");
    } catch (err) {
      if (err?.name === "UserNotFoundException") {
        setNotice("A new code is on its way.");
      } else {
        setError(friendlyError(err, "The code could not be resent. Try again."));
      }
    } finally {
      setIsLoading(false);
    }
  };

  /* =========================================================
     CHECK YOUR EMAIL — the designed screen
     ========================================================= */

  if (stage === "sent") {
    return (
      <AuthShell>
        <div className="login-header">
          <h2>Check your email</h2>

          <p>
            We&apos;ve sent a password reset code to your email address. Enter
            it on the next screen to choose a new password.
          </p>
        </div>

        <div className="check-email-art" aria-hidden="true">
          <EnvelopeIcon />
        </div>

        <div className="login-form">
          {notice && <p className="form-notice">{notice}</p>}

          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}

          {/* The design's primary action here is "Open Email App". A web page
              cannot reliably open a desktop mail client — the nearest thing is
              a mailto:, which opens a blank compose window and helps nobody.
              The button does the thing the flow actually needs instead. */}
          <button
            type="button"
            className="login-button"
            onClick={() =>
              navigate("/reset-password", { state: { email: email.trim() } })
            }
          >
            Enter reset code
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
        </div>
      </AuthShell>
    );
  }

  /* =========================================================
     REQUEST — no design supplied, built to match
     ========================================================= */

  return (
    <AuthShell>
      <div className="login-header">
        <h2>Forgot your password?</h2>

        <p>Enter your email and we&apos;ll send you a reset code.</p>
      </div>

      <form onSubmit={handleRequest} className="login-form">
        <div className="field">
          <label htmlFor="reset-email">Email Address</label>

          <div className="input-wrapper">
            <input
              id="reset-email"
              type="email"
              placeholder="e.g. researcher@drp.inst"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
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
              Sending...
            </>
          ) : (
            "Send reset code"
          )}
        </button>

        <div className="auth-switch">
          <button type="button" onClick={() => navigate("/login")}>
            Back to sign in
          </button>
        </div>
      </form>
    </AuthShell>
  );
};

export default ForgotPassword;
