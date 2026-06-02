// Type declarations for Modal JavaScript client
declare module "modal" {
  export class ModalClient {
    functions: {
      fromName(appName: string, functionName: string): Promise<ModalFunction>;
    };
  }

  export class ModalFunction {
    remote(args?: any[]): Promise<any>;
  }
}
