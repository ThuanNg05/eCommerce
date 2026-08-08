declare module 'html2pdf.js' {
  interface Html2PdfOptions {
    margin?: number | number[] | [number, number] | [number, number, number, number]
    filename?: string
    image?: { type?: 'jpeg' | 'png' | 'webp'; quality?: number }
    html2canvas?: {
      scale?: number
      useCORS?: boolean
      logging?: boolean
      windowWidth?: number
      windowHeight?: number
      x?: number
      y?: number
      width?: number
      height?: number
    }
    jsPDF?: { unit?: string; format?: string | number[]; orientation?: 'portrait' | 'landscape' | 'p' | 'l' }
    pagebreak?: { mode?: string | string[]; before?: string | string[]; after?: string | string[] }
  }

  interface Html2PdfWorker {
    set(options: Html2PdfOptions): Html2PdfWorker
    from(element: HTMLElement | string): Html2PdfWorker
    toContainer(): Html2PdfWorker
    toCanvas(): Html2PdfWorker
    toImg(): Html2PdfWorker
    toPdf(): Html2PdfWorker
    get(type: string): Promise<any>
    save(): Promise<void>
    outputPdf(type?: string): Promise<any>
  }

  function html2pdf(): Html2PdfWorker
  function html2pdf(element: HTMLElement | string, options?: Html2PdfOptions): Html2PdfWorker

  export default html2pdf
}
