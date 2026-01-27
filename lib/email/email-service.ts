import { Resend } from "resend";
import { render } from "@react-email/render";
import React from "react";
import OrganizationMemberEmail from "./templates/organization-member";

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "noreply@recruitify.tech";

// Cached Resend client instance
let cachedResendClient: Resend | null = null;

/**
 * Gets or creates a Resend client instance with lazy initialization.
 * Throws an error if RESEND_API_KEY is not configured.
 */
function getResendClient(): Resend {
  if (cachedResendClient) {
    return cachedResendClient;
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not configured");
  }

  cachedResendClient = new Resend(apiKey);
  return cachedResendClient;
}

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Validates and sanitizes an email address
 */
function validateEmail(email: string): boolean {
  if (!email || typeof email !== "string") {
    return false;
  }
  // Basic validation
  if (!EMAIL_REGEX.test(email.trim())) {
    return false;
  }
  // Prevent email injection attacks
  if (email.includes("\n") || email.includes("\r") || email.includes("\0")) {
    return false;
  }
  // Limit email length (RFC 5321)
  if (email.length > 254) {
    return false;
  }
  return true;
}

/**
 * Sanitizes string input to prevent injection attacks
 */
function sanitizeString(
  input: string | null,
  maxLength: number = 500,
): string | null {
  if (!input || typeof input !== "string") {
    return input;
  }
  // Remove control characters and trim
  const sanitized = input.replace(/[\x00-\x1F\x7F]/g, "").trim();
  // Limit length
  return sanitized.length > maxLength
    ? sanitized.substring(0, maxLength)
    : sanitized;
}

export interface SendOrganizationMemberEmailParams {
  recipientEmail: string;
  recipientName: string | null;
  organizationName: string;
  inviterName: string | null;
  inviterEmail: string;
  role: string;
  hasAccount: boolean;
  dashboardUrl: string;
}

/**
 * Sends an email notification when a user is added to an organization
 *
 * Security measures:
 * - Validates all email addresses
 * - Sanitizes all string inputs
 * - Prevents email injection attacks
 * - Only sends if API key is configured
 */
export async function sendOrganizationMemberEmail({
  recipientEmail,
  recipientName,
  organizationName,
  inviterName,
  inviterEmail,
  role,
  hasAccount,
  dashboardUrl,
}: SendOrganizationMemberEmailParams): Promise<void> {
  try {
    // Check if API key is configured (early return to avoid unnecessary processing)
    if (!process.env.RESEND_API_KEY) {
      console.warn("RESEND_API_KEY is not configured. Skipping email send.");
      return;
    }

    // Validate and sanitize all inputs
    if (!validateEmail(recipientEmail)) {
      console.error("Invalid recipient email address provided");
      return;
    }

    if (!validateEmail(inviterEmail)) {
      console.error("Invalid inviter email address provided");
      return;
    }

    // Sanitize all string inputs
    const sanitizedRecipientName = sanitizeString(recipientName, 100);
    const sanitizedOrganizationName = sanitizeString(organizationName, 200);
    const sanitizedInviterName = sanitizeString(inviterName, 100);
    const sanitizedInviterEmail = sanitizeString(inviterEmail.trim(), 254);
    const sanitizedRole = sanitizeString(role, 50);

    // Handle null case for sanitizedInviterEmail - use original validated email as fallback
    if (!sanitizedInviterEmail) {
      console.error("Sanitized inviter email is null or empty");
      return;
    }

    // Validate dashboard URL format
    let sanitizedDashboardUrl = dashboardUrl.trim();
    let url: URL;
    try {
      url = new URL(sanitizedDashboardUrl);
    } catch {
      console.error("Invalid dashboard URL format");
      return;
    }

    // Check protocol - only allow https: and http:
    const allowedProtocols = ["https:", "http:"];
    if (!allowedProtocols.includes(url.protocol)) {
      console.error("Dashboard URL has disallowed protocol:", dashboardUrl, "Protocol:", url.protocol);
      return;
    }

    // Render the email template to HTML
    const emailHtml = await render(
      OrganizationMemberEmail({
        recipientName: sanitizedRecipientName,
        organizationName: sanitizedOrganizationName || "Organization",
        inviterName: sanitizedInviterName,
        inviterEmail: sanitizedInviterEmail,
        role: sanitizedRole || "Member",
        hasAccount,
        dashboardUrl: sanitizedDashboardUrl,
      }) as React.ReactElement,
    );

    // Send the email
    const resend = getResendClient();
    const { data, error } = await resend.emails.send({
      from: `Recruitify <${FROM_EMAIL}>`,
      to: recipientEmail.trim().toLowerCase(),
      subject: `You've been added to ${sanitizedOrganizationName || "an organization"}`,
      html: emailHtml,
    });

    if (error) {
      console.error("Failed to send organization member email:", error);
      // Error is logged and function returns - outer catch will also log it
      // but won't throw, ensuring email failures don't block member addition
      return;
    }

    console.log("Organization member email sent successfully:", data?.id);
  } catch (error) {
    // Log error but don't throw - we don't want email failures to block member addition
    console.error("Error sending organization member email:", error);
    // Don't expose internal error details to prevent information leakage
  }
}
