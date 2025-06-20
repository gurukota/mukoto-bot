// Type definitions for Paynow API
declare module 'paynow' {
  export interface PaynowConfig {
    integrationId: string;
    integrationKey: string;
    resultUrl: string;
    returnUrl: string;
  }

  export interface PaynowPayment {
    add(title: string, amount: number): void;
  }

  export interface PaynowResponse {
    success: boolean;
    pollUrl?: string;
    redirectUrl?: string;
    innbucks_info?: Array<{
      authorizationcode: string;
      deep_link_url: string;
    }>;
  }

  export interface PaynowTransaction {
    status: 'paid' | 'cancelled' | 'failed' | 'awaiting delivery' | 'delivered';
  }

  export class Paynow {
    constructor(integrationId: string, integrationKey: string);
    resultUrl: string;
    returnUrl: string;
    createPayment(reference: string, email: string): PaynowPayment;
    send(payment: PaynowPayment): Promise<PaynowResponse>;
    sendMobile(payment: PaynowPayment, phone: string, method: string): Promise<PaynowResponse>;
    pollTransaction(pollUrl: string): Promise<PaynowTransaction>;
  }
}
