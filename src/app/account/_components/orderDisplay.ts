import type { OrderFinancialStatus, OrderFulfillmentStatus } from '@/shopify/storefront';

export function formatStatus(status?: OrderFulfillmentStatus | OrderFinancialStatus | null) {
  if (!status) return 'N/A';

  return status
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

export const getStatusBadgeVariant = (
  status?: OrderFulfillmentStatus | OrderFinancialStatus | null,
): 'default' | 'secondary' | 'outline' => {
  if (!status) return 'outline';

  const statusLower = status.toLowerCase();

  if (statusLower.includes('fulfilled') || statusLower.includes('paid')) {
    return 'default';
  }

  if (statusLower.includes('pending') || statusLower.includes('unfulfilled')) {
    return 'secondary';
  }

  return 'outline';
};
