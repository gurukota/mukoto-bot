// Type definitions for WhatsApp Cloud API wrapper
declare module 'whatsappcloudapi_wrapper' {
  export interface WhatsAppCloudAPIConfig {
    accessToken: string;
    senderPhoneNumberId: string;
    WABA_ID: string;
    graphAPIVersion: string;
  }

  export interface SendTextParams {
    recipientPhone: string;
    message: string;
  }

  export interface SendImageParams {
    recipientPhone: string;
    url: string;
    caption: string;
  }

  export interface SendDocumentParams {
    recipientPhone: string;
    caption: string;
    mime_type: string;
    file_path: string;
  }

  export interface SendLocationParams {
    recipientPhone: string;
    latitude: number;
    longitude: number;
    name: string;
    address: string;
  }

  export interface SimpleButton {
    title: string;
    id: string;
  }

  export interface SendSimpleButtonsParams {
    recipientPhone: string;
    message: string;
    listOfButtons: SimpleButton[];
  }

  export interface RadioRow {
    id: string;
    title: string;
    description: string;
  }

  export interface RadioSection {
    title: string;
    rows: RadioRow[];
  }

  export interface SendRadioButtonsParams {
    recipientPhone: string;
    headerText: string;
    bodyText: string;
    footerText: string;
    listOfSections: RadioSection[];
    actionTitle: string;
  }

  export interface CreateQRCodeParams {
    message: string;
    imageType: string;
  }

  export interface QRCodeResponse {
    data: {
      qr_image_url: string;
    };
  }

  export interface WhatsAppMessage {
    text?: {
      body: string;
    };
    type: string;
    button_reply?: {
      id: string;
    };
    list_reply?: {
      id: string;
    };
    from: {
      phone: string;
      name: string;
    };
  }

  export interface ParsedData {
    isMessage: boolean;
    message: WhatsAppMessage;
  }

  export default class WhatsAppCloudAPI {
    constructor(config: WhatsAppCloudAPIConfig);
    sendText(params: SendTextParams): Promise<any>;
    sendImage(params: SendImageParams): Promise<any>;
    sendDocument(params: SendDocumentParams): Promise<any>;
    sendLocation(params: SendLocationParams): Promise<any>;
    sendSimpleButtons(params: SendSimpleButtonsParams): Promise<any>;
    sendRadioButtons(params: SendRadioButtonsParams): Promise<any>;
    createQRCodeMessage(params: CreateQRCodeParams): Promise<QRCodeResponse>;
    parseMessage(body: any): ParsedData;
  }
}
