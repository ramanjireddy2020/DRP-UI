import React from "react";

/**
 * The password policy, shown as a live checklist.
 *
 * Straight from the reset design: four rules, each with a dot that fills teal
 * once the rule is met. Checking as the user types is the point — Cognito only
 * reports a policy failure after the request, which on a reset means burning
 * the verification code to find out the password was a character short.
 *
 * These four must stay in step with the Cognito user pool's own policy. They
 * describe the default (8 characters, upper, number, symbol); if the pool is
 * ever loosened or tightened, change it here too, because
 * `meetsPasswordPolicy` is what gates the submit button.
 */
export const PASSWORD_RULES = [
  {
    id: "length",
    label: "At least 8 characters",
    test: (value) => value.length >= 8,
  },
  {
    id: "uppercase",
    label: "At least one uppercase letter",
    test: (value) => /[A-Z]/.test(value),
  },
  {
    id: "number",
    label: "At least one number",
    test: (value) => /\d/.test(value),
  },
  {
    id: "special",
    label: "At least one special character",
    test: (value) => /[^A-Za-z0-9]/.test(value),
  },
];

export const meetsPasswordPolicy = (value) =>
  PASSWORD_RULES.every((rule) => rule.test(value ?? ""));

const PasswordRules = ({ value = "" }) => (
  <ul className="password-rules">
    {PASSWORD_RULES.map((rule) => {
      const met = rule.test(value);

      return (
        <li
          key={rule.id}
          className={`password-rule ${met ? "is-met" : ""}`}
        >
          <span className="rule-dot" aria-hidden="true" />
          {rule.label}
        </li>
      );
    })}
  </ul>
);

export default PasswordRules;
