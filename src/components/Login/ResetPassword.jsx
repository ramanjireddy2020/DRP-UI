import React, { useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { confirmResetPassword } from "@aws-amplify/auth";
import AuthShell from "./AuthShell";
import { EyeIcon, EyeOffIcon } from "./authIcons";
import PasswordRules, { meetsPasswordPolicy } from "./passwordRules";
import "./Login.css";

/**
 * Password reset, part two: the "Set new password" design.
 *
 * Its own route rather than a stage of ForgotPassword, because this is where a
 * reset link has to be able to land. `email` and `code` are read from the
 * query string first and from router state second, so both routes in work:
 *
 *   /reset-password?email=…&code=…   a link from the reset email
 *   /reset-password                  arriving from "Check your email"
 *
 * The design shows no code field, which is right for a link — the code is in
 * the URL. Stock Cognito emails a code rather than a link, so the field is
 * rendered only when the URL did not supply one. Nothing to change here when
 * the link lands; the field simply stops appearing.
 */

const friendlyError = (error, fallback) => {
  switch (error?.name) {
    case "CodeMismatchException":
      return "That code is not right. Check the email and try again.";
    case "ExpiredCodeException":
      return "That code has expired. Request a new one from the sign-in screen.";
    case "InvalidPasswordException":
      return error.message || "That password does not meet the password policy.";
    case "LimitExceededException":
    case "TooManyRequestsException":
      return "Too many attempts. Wait a few minutes and try again.";
    default:
      return error?.message || fallback;
  }
};

const ResetPassword = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const emailFromUrl = searchParams.get("email") || location.state?.email || "";
  const codeFromUrl = searchParams.get("code") || "";

  const [email, setEmail] = useState(emailFromUrl);
  const [code, setCode] = useState(codeFromUrl);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const policyMet = meetsPasswordPolicy(newPassword);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isLoading) return;

    if (!email.trim()) {
      setError("Enter the email address on your account.");
      return;
    }

    if (!code.trim()) {
      setError("Enter the verification code from your email.");
      return;
    }

    if (!policyMet) {
      setError("Your new password does not meet all four requirements.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("The two passwords do not match.");
      return;
    }

    setError("");
    setIsLoading(true);

    try {
      await confirmResetPassword({
        username: email.trim(),
        confirmationCode: code.trim(),
        newPassword,
      });

      // Back to sign-in rather than signing them in here: the reset call
      // returns no session, so an automatic sign-in would be a second request
      // that can fail on its own and strand the user on a screen whose job is
      // already done.
      navigate("/login", {
        replace: true,
        state: { notice: "Your password has been reset. Sign in to continue." },
      });
    } catch (err) {
      setError(friendlyError(err, "The password could not be reset. Try again."));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthShell>
      <div className="login-header">
        <h2>Set new password</h2>

        <p>
          Your new password must be different from previously used passwords
        </p>
      </div>

      <form onSubmit={handleSubmit} className="login-form">
        {/* Only when the URL did not carry them. A reset link supplies both,
            and the design's field-free layout is what renders then. */}
        {!emailFromUrl && (
          <div className="field">
            <label htmlFor="reset-email-confirm">Email Address</label>

            <div className="input-wrapper">
              <input
                id="reset-email-confirm"
                type="email"
                placeholder="e.g. researcher@drp.inst"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>
          </div>
        )}

        {!codeFromUrl && (
          <div className="field">
            <label htmlFor="reset-code">Verification Code</label>

            <div className="input-wrapper">
              <input
                id="reset-code"
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
        )}

        {/* New password */}
        <div className="field">
          <label htmlFor="reset-new-password">New Password</label>

          <div className="input-wrapper">
            <input
              id="reset-new-password"
              type={showNew ? "text" : "password"}
              placeholder="Enter your new password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
              required
            />

            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowNew((previous) => !previous)}
              aria-label={showNew ? "Hide password" : "Show password"}
            >
              {showNew ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          </div>
        </div>

        {/* Confirm new password */}
        <div className="field">
          <label htmlFor="reset-confirm-password">Confirm New Password</label>

          <div className="input-wrapper">
            <input
              id="reset-confirm-password"
              type={showConfirm ? "text" : "password"}
              placeholder="Re-enter your new password"
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

        {/* The policy, checked as they type. Cognito only reports a policy
            failure after the request, which on a reset means spending the
            verification code to find out the password was a character short. */}
        <PasswordRules value={newPassword} />

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
              Resetting...
            </>
          ) : (
            "Reset Password"
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

export default ResetPassword;
