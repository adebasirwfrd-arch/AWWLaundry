'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@aww/shared';
import { palette } from '@aww/design-tokens';

interface AnalyticsChartsProps {
  dailyData: Array<{ date: string; orders: number; revenue: number }>;
  paymentBreakdown: Array<{
    method: string;
    total: number;
    count: number;
    percent: number;
  }>;
}

export function AnalyticsCharts({ dailyData, paymentBreakdown }: AnalyticsChartsProps) {
  return (
    <>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Order per Hari (7 hari)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="orders" fill={palette.rainbow.cyan} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pendapatan per Hari (7 hari)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Bar dataKey="revenue" fill={palette.brand.orange} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Metode Pembayaran (30 hari)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            {paymentBreakdown.map((p) => (
              <div key={p.method} className="rounded-aww-lg bg-brand-sky/10 p-4">
                <p className="text-sm text-brand-navy/60">{p.method}</p>
                <p className="font-display text-xl font-bold text-brand-navy">
                  {formatCurrency(p.total)}
                </p>
                <p className="text-xs text-brand-navy/50">
                  {p.count} transaksi · {p.percent.toFixed(0)}%
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </>
  );
}
