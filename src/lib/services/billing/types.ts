export interface Callbacks{
    OnSuccess(input?:any):void;
    OnError(input?:any):void;
    OnPending?(input?:any):void;
    OnProcessing?(input?:any):void;
    OnCancel(input?:any):void;
}


export interface RenderOptions {
  container: HTMLElement;
//   Any extra rendering options for the provider's checkout UI.
}