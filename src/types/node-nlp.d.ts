declare module 'node-nlp' {
  export class NlpManager {
    constructor(options: {
      languages: string[];
      forceNER?: boolean;
      [key: string]: any;
    });
    
    addDocument(language: string, utterance: string, intent: string): void;
    train(): Promise<void>;
    save(filename?: string): void;
    process(language: string, utterance: string): Promise<any>;
  }
}
