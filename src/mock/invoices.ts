/** What the invoice scanner "reads" off the receipt in the viewfinder. One fixed result: the demo has no camera. */
export interface ScannedInvoice {
  vendor: string;
  address: string;
  date: string;
  /** In euros, VAT included. */
  total: number;
  vat: number;
  number: string;
  lines: { label: string; amount: number }[];
}

export const scannedInvoice: ScannedInvoice = {
  vendor: 'Bauhaus Wien Mitte',
  address: 'Landstraßer Hauptstraße 1, 1030 Wien',
  date: '2026-10-20',
  total: 48.6,
  vat: 8.1,
  number: 'R-2026-118342',
  lines: [
    { label: 'Gaffer tape 50 mm ×2', amount: 25.8 },
    { label: 'Cable ties, 200 pcs', amount: 9.9 },
    { label: 'AA batteries, 24 pack', amount: 12.9 },
  ],
};

/** Where crew can book an expense; the first is preselected. */
export const INVOICE_CATEGORIES = ['Expendables', 'Travel', 'Meals', 'Kit rental'] as const;
