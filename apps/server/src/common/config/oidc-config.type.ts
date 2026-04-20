export type OidcConfig = {
  enabled: boolean;
  authority: string;
  clientId: string;
  clientSecret: string;
  scope: string;
  source: "ui" | "env" | "control_plane" | "none";
};
