declare module 'paynow' {
  export interface PaynowPayment {
    add(title: string, amount: number): void;
    info: {
      reference: string;
      total: number;
      status: string;
    };
  }

  export interface PaynowResponse {
    success: boolean;
    hasRedirect: boolean;
    redirectUrl?: string;
    pollUrl: string;
    error?: string;
    errors?: { [key: string]: string };
    innbucks_info?: Array<{
      authorizationcode: string;
      deep_link_url: string;
    }>;
  }

  export interface TransactionStatus {
    status: 'paid' | 'cancelled' | 'failed' | 'created' | 'sent' | 'awaiting delivery';
    reference: string;
    paynowreference: string;
    amount: number;
    hash: string;
  }

  export class Paynow {
    constructor(integrationId: string, integrationKey: string);
    
    resultUrl: string;
    returnUrl: string;
    
    createPayment(authemail: string, authphone?: string): PaynowPayment;
    send(payment: PaynowPayment): Promise<PaynowResponse>;
    sendMobile(payment: PaynowPayment, phone: string, method: string): Promise<PaynowResponse>;
    pollTransaction(pollUrl: string): Promise<TransactionStatus>;
  }
}
