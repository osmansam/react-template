declare module "pdfmake/build/pdfmake" {
  type PdfMakeDocumentDefinition = Record<string, unknown>;

  interface PdfMake {
    fonts: Record<string, unknown>;
    createPdf: (definition: PdfMakeDocumentDefinition) => {
      open: () => void;
      download: (filename?: string) => void;
    };
  }

  const pdfMake: PdfMake;
  export default pdfMake;
}
