import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const odooModelMap = {
  rfp: 'purchase.order',
  sales: 'sale.order',
  invoice: 'account.move',
} as const;

/**
 * Build a URL to open an Odoo record in its web interface.
 * Returns null if NEXT_PUBLIC_ODOO_URL is not set.
 */
export function getOdooRecordUrl(
  type: 'rfp' | 'sales' | 'invoice',
  id: number
): string | null {
  const baseUrl = process.env.NEXT_PUBLIC_ODOO_URL;
  if (!baseUrl) return null;
  const model = odooModelMap[type];
  return `${baseUrl.replace(/\/$/, '')}/web#id=${id}&model=${model}&view_type=form`;
}
