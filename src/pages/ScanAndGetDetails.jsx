import React from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { getOrders, getTailors } from '../api/nocodb';
import { TAILOR_LOCATION_ID } from '../constants/index.js';

const QR_READER_ELEMENT_ID = 'qr-reader';

const ScanAndGetDetails = () => {
  const [order, setOrder] = React.useState({});
  const [tailor, setTailor] = React.useState([]);
  const [orderId, setOrderId] = React.useState('');
  const [isScanning, setIsScanning] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState('');

  const scannerRef = React.useRef(null);

  const fetchTailorDetails = async (order_id) => {
    try {
      const tailorResponse = await getTailors(order_id);
      const data = tailorResponse.list || [];
      const filterOnlyTailors = data
        .filter((row) => row.locations.id === TAILOR_LOCATION_ID)
        .sort((a, b) => new Date(b.scanned_timestamp) - new Date(a.scanned_timestamp));

      setTailor(filterOnlyTailors);
    } catch (err) {
      console.error('Error fetching tailor details:', err);
      setError('Failed to fetch tailor details.');
    }
  };

  const fetchOrderDetails = async (order_id) => {
    if (!order_id || !order_id.trim()) {
      setError('Please enter or scan an Order ID.');
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      const orderResponse = await getOrders(order_id);
      const data = orderResponse.list?.[0] || {};
      setOrder(data);
      if (!orderResponse.list?.[0]) {
        setError('No order found for this ID.');
      }
      await fetchTailorDetails(order_id);
    } catch (err) {
      console.error('Error fetching order details:', err);
      setError('Failed to fetch order details.');
    } finally {
      setIsLoading(false);
    }
  };

  const stopScanner = React.useCallback(async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        await scannerRef.current.clear();
      } catch (err) {
        // scanner already stopped
      }
      scannerRef.current = null;
    }
    setIsScanning(false);
  }, []);

  const startScanner = async () => {
    setError('');
    setIsScanning(true);
  };

  React.useEffect(() => {
    if (!isScanning) return;

    const html5Qrcode = new Html5Qrcode(QR_READER_ELEMENT_ID);
    scannerRef.current = html5Qrcode;

    html5Qrcode
      .start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          const scannedId = decodedText.trim();
          setOrderId(scannedId);
          stopScanner();
          fetchOrderDetails(scannedId);
        },
        () => {
          // ignore per-frame decode errors
        }
      )
      .catch((err) => {
        console.error('Unable to start camera:', err);
        setError('Unable to access camera. Please check permissions.');
        setIsScanning(false);
      });

    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isScanning]);

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold text-gray-900">Scan &amp; Get Details</h1>
          <p className="mt-1 text-sm text-gray-500">
            Scan an order QR code or enter the Order ID manually.
          </p>
        </div>

        {/* Search / scan controls */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              type="text"
              value={orderId}
              onChange={(e) => setOrderId(e.target.value)}
              placeholder="Enter Order ID"
              className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
            <button
              onClick={() => fetchOrderDetails(orderId)}
              disabled={isLoading}
              className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading ? 'Fetching...' : 'Fetch Order Details'}
            </button>
            <button
              onClick={() => (isScanning ? stopScanner() : startScanner())}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="h-4 w-4"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 7V5a2 2 0 012-2h2M17 3h2a2 2 0 012 2v2M21 17v2a2 2 0 01-2 2h-2M7 21H5a2 2 0 01-2-2v-2M7 12h10"
                />
              </svg>
              {isScanning ? 'Stop Camera' : 'Scan QR Code'}
            </button>
          </div>

          {error && (
            <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
          )}

          {isScanning && (
            <div className="mt-4">
              <div
                id={QR_READER_ELEMENT_ID}
                className="mx-auto w-full max-w-sm overflow-hidden rounded-lg border border-gray-200"
              />
              <p className="mt-2 text-center text-xs text-gray-400">
                Point the camera at the order QR code.
              </p>
            </div>
          )}
        </div>

        {/* Order details */}
        <div className="mt-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
            Order Details
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-400">
                  <th className="py-2 pr-4 font-medium">Order ID</th>
                  <th className="py-2 pr-4 font-medium">Style Number</th>
                  <th className="py-2 pr-4 font-medium">Size</th>
                  <th className="py-2 pr-4 font-medium">Channel</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-100 text-gray-800">
                  <td className="py-2.5 pr-4">{order.order_id || '—'}</td>
                  <td className="py-2.5 pr-4">{order.style_number || '—'}</td>
                  <td className="py-2.5 pr-4">
                    {order.size ? (
                      <span className="inline-flex items-center rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700">
                        {order.size}
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="py-2.5 pr-4">{order.channel || '—'}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Tailor details */}
        <div className="mt-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
            Tailor Details
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-400">
                  <th className="py-2 pr-4 font-medium">Tailor ID</th>
                  <th className="py-2 pr-4 font-medium">Scanned Timestamp</th>
                  <th className="py-2 pr-4 font-medium">Location ID</th>
                </tr>
              </thead>
              <tbody>
                {tailor.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-4 text-center text-gray-400">
                      No tailor records found.
                    </td>
                  </tr>
                ) : (
                  tailor.map((t) => (
                    <tr
                      key={`${t.order_id}-${t.scanned_timestamp}`}
                      className="border-b border-gray-100 text-gray-800"
                    >
                      <td className="py-2.5 pr-4">{t.order_id}</td>
                      <td className="py-2.5 pr-4">{t.scanned_timestamp}</td>
                      <td className="py-2.5 pr-4">{t.locations.id}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScanAndGetDetails;
