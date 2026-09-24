'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { reorderAction } from '@/actions/cartActions';
import { Button } from '@/components/ui/button';
import config from '@/config';
import { reportError } from '@/lib/logger';

import { Printer, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';

const OrderDetailActions = ({ orderId, orderName }: { orderId: string; orderName: string }) => {
  const router = useRouter();
  const [isReordering, setIsReordering] = useState(false);

  const handleReorder = async () => {
    setIsReordering(true);
    try {
      const response = await reorderAction(orderId);
      toast.success(response.message ?? `Order ${orderName} added back to your cart`);
      router.push(config.routes.cart);
    } catch (error) {
      reportError('order-detail/reorder', error);
      toast.error(error instanceof Error ? error.message : 'Unable to reorder these items');
      setIsReordering(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="outline" size="sm" onClick={() => window.print()}>
        <Printer size={16} aria-hidden="true" />
        Print
      </Button>
      <Button size="sm" loading={isReordering} onClick={handleReorder}>
        <RotateCcw size={16} aria-hidden="true" />
        Reorder
      </Button>
    </div>
  );
};

export default OrderDetailActions;
