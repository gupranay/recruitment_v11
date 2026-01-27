import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";

interface OrganizationMemberEmailProps {
  recipientName: string | null;
  organizationName: string;
  inviterName: string | null;
  inviterEmail: string;
  role: string;
  hasAccount: boolean;
  dashboardUrl: string;
}

export const OrganizationMemberEmail = ({
  recipientName,
  organizationName,
  inviterName,
  inviterEmail,
  role,
  hasAccount,
  dashboardUrl,
}: OrganizationMemberEmailProps) => {
  return (
    <Html>
      <Head />
      <Preview>You've been added to {organizationName}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>You've been added to {organizationName}</Heading>
          
          {hasAccount && recipientName && (
            <Text style={text}>
              Hi {recipientName},
            </Text>
          )}
          
          <Text style={text}>
            You've been added to the <strong style={boldText}>{organizationName}</strong> organization on Recruitify.
          </Text>

          <Text style={text}>
            <strong style={boldText}>Added by:</strong>{" "}
            {inviterName ? (
              <>
                {inviterName} <span style={emailText}>({inviterEmail})</span>
              </>
            ) : (
              <span style={emailText}>{inviterEmail}</span>
            )}
          </Text>

          <Text style={text}>
            <strong style={boldText}>Your role:</strong> {role}
          </Text>

          <Text style={text}>
            {hasAccount 
              ? "You can now access the organization's recruitment cycles and collaborate with your team."
              : "Sign up for a Recruitify account to access the organization's recruitment cycles and collaborate with your team."
            }
          </Text>

          <Section style={buttonContainer}>
            <Button style={button} href={dashboardUrl}>
              {hasAccount ? "Go to Dashboard" : "Sign Up & Access Dashboard"}
            </Button>
          </Section>

          <Text style={footer}>
            This is an automated message from{" "}
            <Link href="https://recruitify.tech" style={link}>
              Recruitify
            </Link>
            . Please do not reply to this email.
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

export default OrganizationMemberEmail;

const main = {
  backgroundColor: "#f8fafc",
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "40px 20px",
  maxWidth: "600px",
  borderRadius: "8px",
};

const h1 = {
  color: "#0f172a",
  fontSize: "28px",
  fontWeight: "700",
  lineHeight: "1.2",
  margin: "0 0 24px",
  padding: "0",
  textAlign: "left" as const,
};

const text = {
  color: "#334155",
  fontSize: "16px",
  lineHeight: "1.6",
  padding: "0",
  margin: "0 0 20px",
  textAlign: "left" as const,
};

const boldText = {
  color: "#0f172a",
  fontWeight: "600",
};

const emailText = {
  color: "#64748b",
  fontSize: "15px",
};

const footer = {
  color: "#94a3b8",
  fontSize: "13px",
  lineHeight: "1.5",
  marginTop: "40px",
  padding: "0",
  textAlign: "center" as const,
};

const link = {
  color: "#22c55e",
  textDecoration: "none",
  fontWeight: "500",
};

const buttonContainer = {
  padding: "0",
  margin: "32px 0",
  textAlign: "center" as const,
};

const button = {
  backgroundColor: "#22c55e",
  borderRadius: "8px",
  color: "#ffffff",
  fontSize: "16px",
  fontWeight: "600",
  textDecoration: "none",
  textAlign: "center" as const,
  display: "inline-block",
  padding: "14px 32px",
  lineHeight: "1.5",
  minWidth: "200px",
};
