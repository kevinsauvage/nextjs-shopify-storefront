import { DEFAULTS } from '@/config/constants';
import type { OrderFieldsFragment } from '@/shopify/storefront';

type TrackingInfoProps = {
  fulfillments: OrderFieldsFragment['successfulFulfillments'];
};

const TrackingInfo = ({ fulfillments }: TrackingInfoProps) => {
  if (!fulfillments || fulfillments.length === 0) return null;

  return (
    <div className="space-y-3">
      <h4 className="text-heading-4">Tracking information</h4>

      {fulfillments.map((fulfillment, index) => {
        const { trackingInfo, trackingCompany } = fulfillment;

        if (!trackingInfo || trackingInfo.length === 0) return null;

        const fulfillmentKey = `${trackingCompany ?? DEFAULTS.carrier}-${trackingInfo[0]?.number ?? `group-${trackingInfo.length}`}`;

        return (
          <div key={fulfillmentKey} className="space-y-2">
            <div className="flex justify-between border-b border-border/70 py-1">
              <span className="text-body-sm text-secondary">
                {trackingCompany || DEFAULTS.carrier}
                {fulfillments.length > 1 ? ` (${index + 1})` : ''}
              </span>
              <span className="text-body-sm font-medium">{trackingInfo.length} items</span>
            </div>

            {trackingInfo.map((trackInfo) => (
              <div
                key={`${trackInfo.number ?? DEFAULTS.trackingNumber}-${typeof trackInfo.url === 'string' ? trackInfo.url : DEFAULTS.link}`}
                className="flex justify-between border-b border-border/70 py-1"
              >
                <span className="text-body-sm text-secondary">
                  {trackInfo.number || DEFAULTS.trackingNumber}
                </span>
                {typeof trackInfo.url === 'string' ? (
                  <a
                    href={trackInfo.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-body-sm font-medium link"
                  >
                    Track
                  </a>
                ) : (
                  <span className="text-body-sm font-medium text-muted">{DEFAULTS.link}</span>
                )}
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
};

export default TrackingInfo;
