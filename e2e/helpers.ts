import { Page, BrowserContext, request } from "@playwright/test";

const BASE = "http://localhost:3000";

/**
 * Generate a unique email for test isolation.
 */
export function uniqueEmail(): string {
  const id = Date.now();
  return `test${id}_${Math.random().toString(36).slice(2, 6)}@example.com`;
}

/**
 * Register a new user via the sign-up API.
 * Returns the Page with session cookies set.
 */
export async function registerUser(
  page: Page,
  email: string,
  password: string,
  name: string = "Test User"
): Promise<void> {
  // Use API request for registration so we get Set-Cookie headers
  const ctx = request.newContext({ baseURL: BASE });

  const res = await (await ctx).post("/api/auth/sign-up/email", {
    data: { name, email, password },
  });

  if (!res.ok()) {
    const body = await res.text();
    throw new Error(`Registration failed (${res.status()}): ${body}`);
  }

  // Extract Set-Cookie headers and set them in the browser context
  const setCookieHeaders = res.headers()["set-cookie"];
  if (setCookieHeaders) {
    // Parse individual cookies from the Set-Cookie header
    const cookies = parseSetCookie(setCookieHeaders);
    await page.context().addCookies(
      cookies.map((c) => ({
        name: c.name,
        value: c.value,
        domain: "localhost",
        path: c.path || "/",
        httpOnly: c.httpOnly ?? true,
        secure: c.secure ?? false,
        sameSite: (c.sameSite as "Lax" | "Strict" | "None") || "Lax",
      }))
    );
  }

  await (await ctx).dispose();
}

/**
 * Login with an existing user via the sign-in API.
 * Returns the Page with session cookies set.
 */
export async function loginUser(
  page: Page,
  email: string,
  password: string
): Promise<void> {
  const ctx = request.newContext({ baseURL: BASE });

  const res = await (await ctx).post("/api/auth/sign-in/email", {
    data: { email, password },
  });

  if (!res.ok()) {
    const body = await res.text();
    throw new Error(`Login failed (${res.status()}): ${body}`);
  }

  // Extract Set-Cookie headers and set them in the browser context
  const setCookieHeaders = res.headers()["set-cookie"];
  if (setCookieHeaders) {
    const cookies = parseSetCookie(setCookieHeaders);
    await page.context().addCookies(
      cookies.map((c) => ({
        name: c.name,
        value: c.value,
        domain: "localhost",
        path: c.path || "/",
        httpOnly: c.httpOnly ?? true,
        secure: c.secure ?? false,
        sameSite: (c.sameSite as "Lax" | "Strict" | "None") || "Lax",
      }))
    );
  }

  await (await ctx).dispose();
}

/**
 * Create a debt via the API.
 * The page must already have session cookies set.
 */
export async function createDebt(
  page: Page,
  data: {
    type: string;
    balance: number;
    monthlyPayment?: number;
    interestRate?: number | null;
    status?: string;
  }
): Promise<Record<string, unknown>> {
  const res = await page.request.post("/api/debt", {
    data: {
      type: data.type,
      balance: data.balance,
      monthlyPayment: data.monthlyPayment || 0,
      interestRate: data.interestRate ?? null,
      status: data.status || "active",
      startDate: new Date().toISOString(),
    },
  });

  if (!res.ok()) {
    const body = await res.text();
    throw new Error(`Create debt failed (${res.status()}): ${body}`);
  }

  return res.json();
}

/**
 * Simple Set-Cookie header parser.
 */
interface ParsedCookie {
  name: string;
  value: string;
  path?: string;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: string;
}

function parseSetCookie(setCookieHeader: string): ParsedCookie[] {
  // Multiple set-cookie headers are joined with a comma by headers() in some runtimes.
  // Better to handle single cookie directives.
  const cookies: ParsedCookie[] = [];

  // Split on comma that's not inside a quoted string
  const parts = setCookieHeader.split(",");
  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;

    const segments = trimmed.split(";").map((s) => s.trim());
    if (segments.length === 0) continue;

    const nameValue = segments[0];
    const eqIdx = nameValue.indexOf("=");
    if (eqIdx === -1) continue;

    const cookie: ParsedCookie = {
      name: nameValue.substring(0, eqIdx).trim(),
      value: nameValue.substring(eqIdx + 1).trim(),
    };

    for (let i = 1; i < segments.length; i++) {
      const attr = segments[i];
      const [key, ...valParts] = attr.split("=");
      const val = valParts.join("=").trim();
      switch (key.toLowerCase()) {
        case "path":
          cookie.path = val;
          break;
        case "httponly":
          cookie.httpOnly = true;
          break;
        case "secure":
          cookie.secure = true;
          break;
        case "samesite":
          cookie.sameSite = val.charAt(0).toUpperCase() + val.slice(1).toLowerCase();
          break;
      }
    }

    cookies.push(cookie);
  }

  return cookies;
}
