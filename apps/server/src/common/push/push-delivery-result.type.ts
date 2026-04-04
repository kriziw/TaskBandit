export type PushDeliveryResult =
  | {
      status: "sent";
      providerMessageId?: string | null;
    }
  | {
      status: "failed";
      errorMessage: string;
    };
