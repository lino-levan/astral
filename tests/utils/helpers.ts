export const serverUrl = Deno.env.get("TEST_SERVER_URL") ||
  "http://example.com";
export const serverHost = new URL(serverUrl).host;
