declare module 'whatsappcloudapi_wrapper' {
  export interface WhatsAppMessage {
    messaging_product: string;
    to: string;
    type: string;
    text?: {
      body: string;
    };
    document?: {
      link: string;
      caption?: string;
      filename?: string;
    };
    interactive?: {
      type: string;
      header?: {
        type: string;
        text: string;
      };
      body: {
        text: string;
      };
      footer?: {
        text: string;
      };
      action: {
        buttons?: Array<{
          type: string;
          reply: {
            id: string;
            title: string;
          };
        }>;
        button?: string;
        url?: string;
      };
    };
  }

  export interface WhatsAppResponse {
    messaging_product: string;
    contacts: Array<{
      input: string;
      wa_id: string;
    }>;
    messages: Array<{
      id: string;
    }>;
    data?: {
      qr_image_url: string;
    };
  }

  export interface SimpleButton {
    title: string;
    id: string;
  }

  export interface ParsedMessage {
    from: {
      phone: string;
      name: string;
    };
    type: string;
    timestamp: string;
    isMessage?: boolean;
    message?: {
      from: {
        phone: string;
        name: string;
      };
      type: string;
      text?: {
        body: string;
      };
      button_reply?: {
        id: string;
        title: string;
      };
      list_reply?: {
        id: string;
        title: string;
        description?: string;
      };
    };
    text?: {
      body: string;
    };
    interactive?: {
      type: string;
      button_reply?: {
        id: string;
        title: string;
      };
      list_reply?: {
        id: string;
        title: string;
        description?: string;
      };
    };
  }

  export default class WhatsAppCloudAPI {
    constructor(config: {
      accessToken: string;
      graphAPIVersion?: string;
      senderPhoneNumberId: string;
      WABA_ID?: string;
    });

    sendMessage(message: WhatsAppMessage): Promise<WhatsAppResponse>;

    sendText(options: {
      message: string;
      recipientPhone: string;
    }): Promise<WhatsAppResponse>;

    sendDocument(options: {
      document?: {
        link: string;
        caption?: string;
        filename?: string;
      };
      recipientPhone: string;
      caption?: string;
      mime_type?: string;
      file_path?: string;
    }): Promise<WhatsAppResponse>;

    sendButton(options: {
      recipientPhone: string;
      headerText?: string;
      bodyText: string;
      footerText?: string;
      listOfButtons: Array<{
        title: string;
        id: string;
      }>;
    }): Promise<WhatsAppResponse>;

    sendSimpleButtons(options: {
      message: string;
      recipientPhone: string;
      listOfButtons: Array<SimpleButton>;
    }): Promise<WhatsAppResponse>;

    sendRadioButtons(options: {
      recipientPhone: string;
      headerText?: string;
      bodyText: string;
      footerText?: string;
      actionTitle?: string;
      listOfSections: Array<{
        title: string;
        rows: Array<{
          id: string;
          title: string;
          description?: string;
        }>;
      }>;
    }): Promise<WhatsAppResponse>;

    sendImage(options: {
      recipientPhone: string;
      url: string;
      caption?: string;
    }): Promise<WhatsAppResponse>;

    sendLocation(options: {
      recipientPhone: string;
      latitude: number;
      longitude: number;
      name?: string;
      address?: string;
    }): Promise<WhatsAppResponse>;

    createQRCodeMessage(options: {
      message: string;
      recipientPhone?: string;
      imageType?: string;
    }): Promise<WhatsAppResponse>;

    parseMessage(body: any): ParsedMessage | null;
  }
}
