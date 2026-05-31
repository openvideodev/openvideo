import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";

interface MagicLinkEmailProps {
  email: string;
  magicLink: string;
}

export function sendMagicLinkEmail({ email, magicLink }: MagicLinkEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Your login link for OpenVideo</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={logoSection}>
            <Text style={logoText}>OpenVideo</Text>
          </Section>
          <Heading style={heading}>Sign in to OpenVideo</Heading>
          <Text style={paragraph}>
            Hi {email}, click the button below to sign in to your account. This link expires in 10
            minutes.
          </Text>
          <Section style={btnContainer}>
            <Button style={button} href={magicLink}>
              Sign In
            </Button>
          </Section>
          <Text style={paragraph}>Or copy and paste this link in your browser:</Text>
          <Link href={magicLink} style={link}>
            {magicLink}
          </Link>
          <Hr style={hr} />
          <Text style={footer}>
            If you didn&apos;t request this, you can safely ignore this email.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export default sendMagicLinkEmail;

const main = {
  backgroundColor: "#0f0f0f",
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", sans-serif',
};

const container = {
  margin: "0 auto",
  padding: "20px 0 48px",
  maxWidth: "560px",
};

const logoSection = {
  marginBottom: "24px",
};

const logoText = {
  fontSize: "24px",
  fontWeight: "700",
  color: "#ffffff",
  margin: "0",
  letterSpacing: "-0.5px",
};

const heading = {
  fontSize: "24px",
  letterSpacing: "-0.5px",
  lineHeight: "1.3",
  fontWeight: "700",
  color: "#ffffff",
  padding: "17px 0 0",
};

const paragraph = {
  margin: "0 0 15px",
  fontSize: "15px",
  lineHeight: "1.4",
  color: "#a1a1aa",
};

const btnContainer = {
  textAlign: "center" as const,
  marginBottom: "24px",
};

const button = {
  backgroundColor: "#ffffff",
  borderRadius: "8px",
  color: "#000000",
  fontSize: "15px",
  textDecoration: "none",
  textAlign: "center" as const,
  display: "inline-block",
  padding: "12px 28px",
  fontWeight: "600",
};

const link = {
  color: "#9b8cff",
  fontSize: "13px",
  wordBreak: "break-all" as const,
};

const hr = {
  borderColor: "#2d2d2d",
  margin: "42px 0 26px",
};

const footer = {
  color: "#6b7280",
  fontSize: "12px",
  lineHeight: "22px",
};
