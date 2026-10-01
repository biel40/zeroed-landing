export interface BetaMailMessage {
  from: { name: string; address: string };
  to: string;
  replyTo: string;
  subject: string;
  text: string;
  disableFileAccess: boolean;
  disableUrlAccess: boolean;
}

export interface BetaSignupRequest {
  method?: string | undefined;
  headers: Record<string, string | string[] | undefined>;
  body?: unknown;
}

export interface BetaSignupResponse {
  setHeader(name: string, value: string): void;
  status(code: number): BetaSignupResponse;
  json(body: { ok: boolean }): void;
}

export type MailSender = (message: BetaMailMessage) => Promise<{
  accepted?: Array<string | { name?: string | undefined; address: string }> | undefined;
}>;

export declare const BETA_INBOX: string;
export declare function createBetaHandler(
  sendMail: MailSender,
  isConfigured: () => boolean,
): (req: BetaSignupRequest, res: BetaSignupResponse) => Promise<void>;
