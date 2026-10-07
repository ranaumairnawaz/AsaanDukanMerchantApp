import { Order } from '../../types';

interface ReceiptCardProps {
  order: Order;
  onClick?: () => void;
  formatPKR: (val?: any) => string;
  formatDate: (dateStr?: string | null) => string;
}

export default function ReceiptCard({ order, onClick, formatPKR, formatDate }: ReceiptCardProps) {
  const isPending = order.status === 'pending';
  const orderTotal = order.total ?? 0;
  const subtotal = order.subtotal ?? Math.max(100, Math.floor(orderTotal * 0.9));
  const shippingCost = order.delivery_charge ?? Math.floor(orderTotal - subtotal);

  return (
    <div
      onClick={onClick}
      className="bg-card-cream rounded-t-lg p-5 text-text-dark relative flex flex-col hover:opacity-95 transition-all cursor-pointer shadow-md pb-8 select-none"
    >
      {/* Header row */}
      <div className="flex justify-between items-start mb-4">
        <span className="font-mono text-xs opacity-60">INV {order.order_number}</span>
        <span className={`px-2 py-0.5 border rounded text-[9px] font-bold uppercase tracking-wider ${
          isPending
            ? 'bg-accent-amber/20 border-accent-amber-border text-accent-amber-border'
            : 'bg-btn-primary/20 border-btn-primary text-btn-primary'
        }`}>
          {order.status}
        </span>
      </div>

      <h4 className="font-bold text-lg mb-1 font-serif text-text-dark">
        Customer: {order.customer_name}
      </h4>
      <p className="text-[10px] text-gray-500 font-mono mb-4">
        {formatDate(order.created_at)}
      </p>

      {/* Line items */}
      <div className="font-mono text-xs space-y-1 mb-4 flex-grow border-t border-black/5 pt-3">
        <div className="flex justify-between text-gray-700">
          <span>Items Subtotal</span>
          <span>{formatPKR(subtotal)}</span>
        </div>
        <div className="flex justify-between text-gray-700">
          <span>Shipping/GST</span>
          <span>{formatPKR(shippingCost)}</span>
        </div>
      </div>

      {/* Total row */}
      <div className="border-t border-dashed border-black/25 pt-3.5 mt-auto">
        <div className="flex justify-between items-baseline">
          <span className="text-[11px] font-bold font-mono">TOTAL</span>
          <span className="text-xl font-bold text-total-red font-mono">{formatPKR(order.total)}</span>
        </div>
      </div>

      {/* Zigzag bottom */}
      <div
        className="absolute -bottom-2 left-0 w-full h-2"
        style={{
          backgroundImage: 'radial-gradient(circle, #F5F0E4 70%, transparent 72%)',
          backgroundSize: '8px 16px',
          backgroundPosition: '-4px 0',
        }}
      />
    </div>
  );
}
