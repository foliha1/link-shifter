export function getAppBaseUrl(): string {
  const envUrl = import.meta.env.VITE_PUBLIC_APP_URL as string | undefined;
  if (envUrl) {
    return envUrl.replace(/\/$/, "");
  }
  if (typeof window === "undefined") {
    return "";
  }
  return window.location.origin;
}
