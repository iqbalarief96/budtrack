import Link from 'next/link';

export default function InsightsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col">
      <div className="p-4 border-b">
        <h1 className="text-2xl font-bold">Insights</h1>
        <div className="flex space-x-4 mt-4">
          <Link
            href="/insights"
            className="px-4 py-2 rounded-lg hover:bg-gray-100"
          >
            Basic Insights
          </Link>
          <Link
            href="/insights/advanced"
            className="px-4 py-2 rounded-lg hover:bg-gray-100"
          >
            Advanced Analytics
          </Link>
        </div>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
} 