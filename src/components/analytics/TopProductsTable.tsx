import type { TopProduct } from "@/modules/analytics/services/sales-analytics.service";

export function TopProductsTable({ products }: { products: TopProduct[] }) {
  return (
    <section className="mb-8 rounded-xl border border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900">
      <h3 className="px-6 pt-6 text-sm font-semibold text-stone-500 dark:text-stone-400">Top products</h3>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-t border-stone-100 text-stone-500 dark:border-stone-800 dark:text-stone-400">
            <tr>
              <th className="px-6 py-2 font-medium">Product</th>
              <th className="px-6 py-2 font-medium">Quantity sold</th>
              <th className="px-6 py-2 font-medium">Revenue</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
            {products.map((product) => (
              <tr key={product.productId}>
                <td className="px-6 py-3 font-medium text-stone-900 dark:text-stone-50">{product.productName}</td>
                <td className="px-6 py-3 text-stone-600 dark:text-stone-400">{product.quantitySold}</td>
                <td className="px-6 py-3 text-stone-600 dark:text-stone-400">GHS {product.revenue.toFixed(2)}</td>
              </tr>
            ))}
            {products.length === 0 && (
              <tr>
                <td colSpan={3} className="px-6 py-6 text-center text-sm text-stone-500 dark:text-stone-400">
                  No product sales in this period.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
