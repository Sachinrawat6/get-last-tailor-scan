import React from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { getOrders, getTailors } from '../api/nocodb';
import { TAILOR_LOCATION_ID } from '../constants/index.js';

const QR_READER_ELEMENT_ID = 'qr-reader';

const formatTimestamp = (ts) => {
  if (!ts) return '—';
  const date = new Date(ts);
  if (isNaN(date.getTime())) return ts;
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const ScanAndGetDetails = () => {
  const [order, setOrder] = React.useState({});
  const [tailor, setTailor] = React.useState([]);
  const [orderId, setOrderId] = React.useState('');
  const [isScanning, setIsScanning] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState('');

  const scannerRef = React.useRef(null);
  const isRunningRef = React.useRef(false);

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
    if (scannerRef.current && isRunningRef.current) {
      try {
        await scannerRef.current.stop();
        await scannerRef.current.clear();
      } catch (err) {
        // scanner already stopped, ignore
      }
      isRunningRef.current = false;
    }
    scannerRef.current = null;
    setIsScanning(false);
  }, []);

  React.useEffect(() => {
    if (!isScanning) return;
    let cancelled = false;

    const init = async () => {
      let cameras = [];
      try {
        cameras = await Html5Qrcode.getCameras();
      } catch (err) {
        console.error('Camera permission/list error:', err);
        setError('Camera access denied. Please allow camera permission.');
        setIsScanning(false);
        return;
      }

      if (cancelled) return;

      if (!cameras || cameras.length === 0) {
        setError('No camera found on this device.');
        setIsScanning(false);
        return;
      }

      const backCamera = cameras.find((c) => /back|rear|environment/i.test(c.label));
      const cameraId = (backCamera || cameras[0]).id;

      const html5Qrcode = new Html5Qrcode(QR_READER_ELEMENT_ID);
      scannerRef.current = html5Qrcode;

      try {
        await html5Qrcode.start(
          cameraId,
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
        );
        if (!cancelled) isRunningRef.current = true;
      } catch (err) {
        console.error('Unable to start camera:', err);
        setError('Unable to start camera on this device.');
        setIsScanning(false);
      }
    };

    init();

    return () => {
      cancelled = true;
      if (scannerRef.current && isRunningRef.current) {
        scannerRef.current
          .stop()
          .then(() => scannerRef.current && scannerRef.current.clear())
          .catch(() => {})
          .finally(() => {
            isRunningRef.current = false;
          });
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isScanning]);

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 via-gray-50 to-indigo-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center rounded-2xl bg-white p-3 shadow-sm">
            <svg
              className="h-8 w-8 text-indigo-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"
              />
            </svg>
          </div>
          <h1 className="mt-4 text-3xl font-bold text-gray-900 sm:text-4xl">
            Scan &amp; Get Details
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Scan an order QR code or enter the Order ID manually
          </p>
        </div>

        {/* Main Card */}
        <div className="overflow-hidden rounded-2xl bg-white shadow-xs ring-1 ring-black/5">
          <div className="p-6 sm:p-8">
            {/* Search Section */}
            <div className="space-y-4">
              <div className="flex flex-col gap-4 sm:flex-row">
                <div className="flex-1">
                  <label htmlFor="order-id" className="sr-only">
                    Order ID
                  </label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                      <svg
                        className="h-5 w-5 text-gray-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                        />
                      </svg>
                    </div>
                    <input
                      id="order-id"
                      type="text"
                      value={orderId}
                      onChange={(e) => setOrderId(e.target.value)}
                      placeholder="Enter Order ID"
                      className="block w-full rounded-xl border-0 bg-gray-50 px-4 py-3 pl-10 text-gray-900 placeholder:text-gray-400 focus:bg-white focus:ring-2 focus:ring-indigo-500 sm:text-sm"
                    />
                  </div>
                </div>

                <div className="flex gap-3 sm:flex-none">
                  <button
                    onClick={() => fetchOrderDetails(orderId)}
                    disabled={isLoading}
                    className="inline-flex flex-1 items-center justify-center rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-indigo-700 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 sm:flex-none sm:px-8"
                  >
                    {isLoading ? (
                      <>
                        <svg className="mr-2 h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          />
                        </svg>
                        Fetching...
                      </>
                    ) : (
                      'Search'
                    )}
                  </button>

                  <button
                    onClick={() => (isScanning ? stopScanner() : setIsScanning(true))}
                    className={`inline-flex flex-1 items-center justify-center rounded-xl px-6 py-3 text-sm font-semibold transition-all sm:flex-none sm:px-8 ${
                      isScanning
                        ? 'bg-red-50 text-red-700 hover:bg-red-100'
                        : 'border-2 border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:shadow-sm'
                    }`}
                  >
                    {isScanning ? (
                      <>
                        <svg
                          className="mr-2 h-4 w-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                        Stop
                      </>
                    ) : (
                      <>
                        <svg
                          className="mr-2 h-4 w-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                        </svg>
                        Scan QR
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="rounded-xl bg-red-50 p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg
                        className="h-5 w-5 text-red-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-red-700">{error}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Scanner */}
              {isScanning && (
                <div className="mt-6 rounded-xl bg-gray-50 p-4">
                  <div className="relative mx-auto max-w-sm overflow-hidden rounded-lg">
                    <div id={QR_READER_ELEMENT_ID} className="aspect-square w-full bg-gray-200" />
                    <div className="absolute inset-0 pointer-events-none">
                      <div className="absolute inset-0 border-2 border-indigo-500/30 rounded-lg" />
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-16 w-16 border-2 border-indigo-500 rounded-lg animate-pulse" />
                    </div>
                  </div>
                  <p className="mt-3 text-center text-sm text-gray-500">
                    Point the camera at the order QR code
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Order Details */}
          {Object.keys(order).length > 0 && (
            <div className="border-t border-gray-200">
              <div className="p-6 sm:p-8">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900">Order Details</h2>
                  <span className="inline-flex items-center rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700">
                    <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-green-500" />
                    Active
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <div className="rounded-lg bg-gray-50 p-4">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Order ID
                    </p>
                    <p className="mt-1 text-sm font-semibold text-gray-900 truncate">
                      {order.order_id || '—'}
                    </p>
                  </div>
                  <div className="rounded-lg bg-gray-50 p-4">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Style No.
                    </p>
                    <p className="mt-1 text-sm font-semibold text-gray-900">
                      {order.style_number || '—'}
                    </p>
                  </div>
                  <div className="rounded-lg bg-gray-50 p-4">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Size
                    </p>
                    {order.size ? (
                      <span className="mt-1 inline-flex items-center rounded-full bg-indigo-100 px-3 py-0.5 text-sm font-medium text-indigo-800">
                        {order.size}
                      </span>
                    ) : (
                      <p className="mt-1 text-sm font-semibold text-gray-900">—</p>
                    )}
                  </div>
                  <div className="rounded-lg bg-gray-50 p-4">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Channel
                    </p>
                    <p className="mt-1 text-sm font-semibold text-gray-900">
                      {order.channel || '—'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tailor Records */}
          {tailor.length > 0 && (
            <div className="border-t border-gray-200">
              <div className="p-6 sm:p-8">
                <h3 className="text-lg font-semibold text-gray-900">
                  Tailor Records
                  <span className="ml-2 text-sm font-normal text-gray-500">({tailor.length})</span>
                </h3>

                <div className="mt-4 flow-root">
                  <ul className="-my-5 divide-y divide-gray-200">
                    {tailor.map((t, index) => (
                      <li key={`${t.order_id}-${t.scanned_timestamp}`} className="py-4">
                        <div className="flex items-center space-x-4">
                          <div className="shrink-0">
                            <div
                              className={`inline-flex h-10 w-10 items-center justify-center rounded-full ${
                                index === 0
                                  ? 'bg-indigo-100 text-indigo-600'
                                  : 'bg-gray-100 text-gray-600'
                              }`}
                            >
                              {index === 0 ? (
                                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                                  <path
                                    fillRule="evenodd"
                                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                              ) : (
                                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                                  <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                                </svg>
                              )}
                            </div>
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className=" text-sm text-gray-500">
                              <span className="text-blue-600 font-semibold">Tailor</span>:{' '}
                              {t.employees.user_name?.split(' / ')[0] || '—'}
                            </p>
                            <p className="text-sm text-gray-500">
                              {formatTimestamp(t.scanned_timestamp)}
                              {console.log('Scanned Timestamp:', t)}
                            </p>
                            {index === 0 && (
                              <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
                                Latest
                              </span>
                            )}
                          </div>
                          {/* <div className="shrink-0 text-right">
                            <p className="text-sm text-gray-500">
                              {formatTimestamp(t.scanned_timestamp)}
                              {console.log('Scanned Timestamp:', t)}
                            </p>
                            {index === 0 && (
                              <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
                                Latest
                              </span>
                            )}
                          </div> */}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Empty State */}
          {Object.keys(order).length === 0 && tailor.length === 0 && !isLoading && !error && (
            <div className="border-t border-gray-200 py-12 text-center">
              <svg
                className="mx-auto h-12 w-12 text-gray-300"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No details to display</h3>
              <p className="mt-1 text-sm text-gray-500">
                Search for an order or scan a QR code to get started.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ScanAndGetDetails;
