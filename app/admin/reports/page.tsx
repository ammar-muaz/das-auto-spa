"use client";

import { useEffect, useState } from "react";
import {
  TrendingUp, DollarSign, Calendar, CheckCircle,
  BarChart3, Star, FileSpreadsheet, FileText,
} from "lucide-react";
import supabase from "@/lib/supabase";
import Link from "next/link";
import {
  PieChart, Pie, Cell, Label, Tooltip,
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer,
} from "recharts";

interface Booking {
  id: string;
  bookingId: string;
  customerName: string;
  service: string;
  date: string;
  amount: number;
  travelFee?: number;
  status: string;
}

const PIE_COLORS = ["#030213", "#4b5563", "#6b7280", "#9ca3af", "#d1d5db"];

const STATUS_COLORS: Record<string, string> = {
  Completed: "#030213",
  Confirmed: "#4b5563",
  Assigned: "#6b7280",
  "In Progress": "#374151",
  "En Route": "#1f2937",
  "Completion Pending": "#9ca3af",
  Cancelled: "#ef4444",
  "Issue/Delayed": "#f97316",
  Pending: "#d1d5db",
};

export default function AdminReportsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  const [serviceFilter, setServiceFilter] = useState<string>("all");

  useEffect(() => {
    const load = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      let rows: any[] | null = null;

      if (token) {
        const res = await fetch("/api/admin/reports", {
          cache: "no-store",
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const json = await res.json();
          rows = json.bookings ?? null;
        }
      }

      if (!rows) {
        const { data } = await supabase
          .from("bookings")
          .select("id, booking_id, customer_name, service_name, scheduled_date, amount, status")
          .order("created_at", { ascending: false });
        rows = data;
      }

      if (rows) {
        setBookings(rows.map((row: any) => ({
          id: row.id,
          bookingId: row.booking_id,
          customerName: row.customer_name,
          service: row.service_name,
          date: row.scheduled_date,
          amount: Number(row.amount),
          status: row.status,
        })));
      }
    };
    load();
  }, []);

  const getTotal = (b: Booking) => b.amount + (b.travelFee || 0);

  const filtered = bookings.filter((b) => {
    const matchDate = (!dateRange.start || b.date >= dateRange.start) && (!dateRange.end || b.date <= dateRange.end);
    const matchService = serviceFilter === "all" || b.service === serviceFilter;
    return matchDate && matchService;
  });

  const totalBookings = filtered.length;
  const completedBookings = filtered.filter((b) => b.status === "Completed").length;
  const totalRevenue = filtered.filter((b) => b.status === "Completed").reduce((s, b) => s + getTotal(b), 0);
  const avgBookingValue = completedBookings > 0 ? totalRevenue / completedBookings : 0;

  const serviceBreakdown = filtered.reduce((acc, b) => {
    acc[b.service] = (acc[b.service] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const statusBreakdown = filtered.reduce((acc, b) => {
    acc[b.status] = (acc[b.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const monthlyData = filtered.reduce((acc, b) => {
    const month = b.date.split("T")[0] || b.date;
    if (!acc[month]) acc[month] = { count: 0, revenue: 0 };
    acc[month].count += 1;
    if (b.status === "Completed") acc[month].revenue += getTotal(b);
    return acc;
  }, {} as Record<string, { count: number; revenue: number }>);

  const pieData = Object.entries(serviceBreakdown).map(([service, count], i) => ({
    service,
    count,
    fill: PIE_COLORS[i % PIE_COLORS.length],
  }));

  const barData = Object.entries(statusBreakdown).map(([status, count]) => ({
    status,
    count,
    fill: STATUS_COLORS[status] ?? "#6b7280",
  }));

  const exportCSV = () => {
    const rows: string[][] = [];
    rows.push(["Das Auto Spa - Reports & Analytics Export"]);
    rows.push([`Generated: ${new Date().toLocaleString("en-MY")}`]);
    if (dateRange.start || dateRange.end) rows.push([`Date Range: ${dateRange.start || "All"} to ${dateRange.end || "All"}`]);
    if (serviceFilter !== "all") rows.push([`Service Filter: ${serviceFilter}`]);
    rows.push([]);
    rows.push(["Summary"]);
    rows.push(["Total Bookings", "Completed", "Total Revenue (RM)", "Avg Booking Value (RM)"]);
    rows.push([totalBookings.toString(), completedBookings.toString(), totalRevenue.toFixed(2), avgBookingValue.toFixed(2)]);
    rows.push([]);
    rows.push(["Service Distribution"]);
    rows.push(["Service", "Count", "Percentage"]);
    Object.entries(serviceBreakdown).forEach(([s, c]) =>
      rows.push([s, c.toString(), `${totalBookings > 0 ? ((c / totalBookings) * 100).toFixed(1) : 0}%`])
    );
    rows.push([]);
    rows.push(["Status Breakdown"]);
    rows.push(["Status", "Count"]);
    Object.entries(statusBreakdown).forEach(([s, c]) => rows.push([s, c.toString()]));
    rows.push([]);
    rows.push(["Booking Details"]);
    rows.push(["Booking ID", "Customer Name", "Service", "Date", "Amount (RM)", "Travel Fee (RM)", "Total (RM)", "Status"]);
    filtered.forEach((b) =>
      rows.push([b.bookingId || b.id, b.customerName, b.service, b.date, b.amount.toFixed(2), (b.travelFee || 0).toFixed(2), getTotal(b).toFixed(2), b.status])
    );
    const csv = rows.map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `das-auto-spa-report-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportPDF = () => {
    const dateStr = new Date().toLocaleString("en-MY", { dateStyle: "long", timeStyle: "short" });
    const filterInfo = [
      dateRange.start || dateRange.end ? `Date: ${dateRange.start || "All"} – ${dateRange.end || "All"}` : null,
      serviceFilter !== "all" ? `Service: ${serviceFilter}` : null,
    ].filter(Boolean).join(" | ");
    const serviceRows = Object.entries(serviceBreakdown).map(([s, c]) =>
      `<tr><td>${s}</td><td>${c}</td><td>${totalBookings > 0 ? ((c / totalBookings) * 100).toFixed(1) : 0}%</td></tr>`
    ).join("") || `<tr><td colspan="3" style="text-align:center;color:#9ca3af">No data</td></tr>`;
    const statusRows = Object.entries(statusBreakdown).map(([s, c]) =>
      `<tr><td>${s}</td><td>${c}</td></tr>`
    ).join("") || `<tr><td colspan="2" style="text-align:center;color:#9ca3af">No data</td></tr>`;
    const monthRows = Object.entries(monthlyData).map(([month, data]) =>
      `<tr><td>${month}</td><td>${data.count}</td><td>RM ${data.revenue.toFixed(2)}</td><td>RM ${data.count > 0 ? (data.revenue / data.count).toFixed(2) : "0.00"}</td></tr>`
    ).join("") || `<tr><td colspan="4" style="text-align:center;color:#9ca3af">No data</td></tr>`;
    const bookingRows = filtered.map((b) =>
      `<tr><td>${b.bookingId || b.id}</td><td>${b.customerName}</td><td>${b.service}</td><td>${b.date}</td><td>RM ${getTotal(b).toFixed(2)}</td><td>${b.status}</td></tr>`
    ).join("") || `<tr><td colspan="6" style="text-align:center;color:#9ca3af">No bookings</td></tr>`;
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Das Auto Spa - Report</title><style>
      *{box-sizing:border-box;margin:0;padding:0}body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#111;padding:32px;font-size:12px}
      .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px;padding-bottom:16px;border-bottom:2px solid #111}
      .header h1{font-size:22px;font-weight:800}.header .sub{color:#6b7280;font-size:11px;margin-top:2px}.header .meta{text-align:right;font-size:11px;color:#6b7280}
      .section{margin-bottom:24px}.section-title{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#9ca3af;margin-bottom:8px}
      .summary-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}
      .summary-card{border:1px solid #e5e7eb;border-radius:10px;padding:12px 16px}.summary-card .label{font-size:10px;color:#9ca3af;font-weight:600;text-transform:uppercase}.summary-card .value{font-size:20px;font-weight:800;margin-top:2px}
      table{width:100%;border-collapse:collapse}th{text-align:left;padding:8px 12px;background:#f9fafb;font-size:10px;text-transform:uppercase;font-weight:700;color:#9ca3af;border-bottom:1px solid #e5e7eb}
      td{padding:8px 12px;border-bottom:1px solid #f3f4f6;font-size:11px;color:#374151}tr:last-child td{border-bottom:none}.table-wrap{border:1px solid #e5e7eb;border-radius:10px;overflow:hidden}
      .two-col{display:grid;grid-template-columns:1fr 1fr;gap:16px}@media print{body{padding:0}}
    </style></head><body>
      <div class="header"><div><h1>Das Auto Spa</h1><div class="sub">Reports &amp; Analytics</div></div><div class="meta"><div>Generated: ${dateStr}</div>${filterInfo ? `<div style="margin-top:4px">${filterInfo}</div>` : ""}</div></div>
      <div class="section"><div class="section-title">Summary</div><div class="summary-grid">
        <div class="summary-card"><div class="label">Total Bookings</div><div class="value">${totalBookings}</div></div>
        <div class="summary-card"><div class="label">Completed</div><div class="value">${completedBookings}</div></div>
        <div class="summary-card"><div class="label">Total Revenue</div><div class="value">RM ${totalRevenue.toFixed(2)}</div></div>
        <div class="summary-card"><div class="label">Avg. Booking</div><div class="value">RM ${avgBookingValue.toFixed(0)}</div></div>
      </div></div>
      <div class="two-col">
        <div class="section"><div class="section-title">Service Distribution</div><div class="table-wrap"><table><thead><tr><th>Service</th><th>Count</th><th>%</th></tr></thead><tbody>${serviceRows}</tbody></table></div></div>
        <div class="section"><div class="section-title">Status Breakdown</div><div class="table-wrap"><table><thead><tr><th>Status</th><th>Count</th></tr></thead><tbody>${statusRows}</tbody></table></div></div>
      </div>
      <div class="section"><div class="section-title">Operational Trends</div><div class="table-wrap"><table><thead><tr><th>Date Period</th><th>Total Orders</th><th>Total Revenue</th><th>Avg. Value</th></tr></thead><tbody>${monthRows}</tbody></table></div></div>
      <div class="section"><div class="section-title">Booking Details (${filtered.length})</div><div class="table-wrap"><table><thead><tr><th>Booking ID</th><th>Customer</th><th>Service</th><th>Date</th><th>Total</th><th>Status</th></tr></thead><tbody>${bookingRows}</tbody></table></div></div>
    </body></html>`;
    const win = window.open("", "_blank", "width=900,height=700");
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 400);
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <main className="p-4 md:p-8">
        <div className="max-w-7xl mx-auto">

          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white rounded-3xl shadow-sm border border-gray-100 p-8 mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-800 mb-1">Reports & Analytics</h1>
              <p className="text-gray-500">Business insights and performance metrics</p>
            </div>
            <div className="flex gap-2">
              <button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 font-medium transition-all">
                <FileSpreadsheet className="w-4 h-4" /> Export CSV
              </button>
              <button onClick={exportPDF} className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 font-medium transition-all">
                <FileText className="w-4 h-4" /> Export PDF
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 mb-6">
            <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Data Filters</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Start Date</label>
                <input type="date" value={dateRange.start} onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-gray-500" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">End Date</label>
                <input type="date" value={dateRange.end} onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-gray-500" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Service Type</label>
                <select value={serviceFilter} onChange={(e) => setServiceFilter(e.target.value)} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-gray-500">
                  <option value="all">All Services</option>
                  <option value="Basic Wash">Basic Wash</option>
                  <option value="Premium Wash">Premium Wash</option>
                  <option value="Interior Cleaning">Interior Cleaning</option>
                  <option value="Full Package">Full Package</option>
                </select>
              </div>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            {[
              { label: "Total Bookings", val: totalBookings, desc: "All recorded bookings", icon: Calendar },
              { label: "Completed", val: completedBookings, desc: "Successfully delivered", icon: CheckCircle },
              { label: "Total Revenue", val: `RM ${totalRevenue.toFixed(2)}`, desc: "From completed bookings", icon: DollarSign },
              { label: "Avg. Booking", val: `RM ${avgBookingValue.toFixed(0)}`, desc: "Average per booking", icon: TrendingUp },
            ].map((card, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-start justify-between mb-3">
                  <p className="text-sm text-gray-500 font-medium">{card.label}</p>
                  <card.icon className="w-5 h-5 text-gray-300" />
                </div>
                <p className="text-2xl font-bold text-gray-900 tabular-nums">{card.val}</p>
                <p className="text-xs text-gray-400 mt-1">{card.desc}</p>
              </div>
            ))}
          </div>

          {/* Charts */}
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            {/* Service Distribution Donut */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 flex flex-col">
              <div className="flex items-center gap-2 mb-4 shrink-0">
                <BarChart3 className="w-5 h-5 text-gray-900" />
                <h2 className="text-lg font-bold text-gray-800">Service Distribution</h2>
              </div>
              {pieData.length === 0 ? (
                <p className="text-center text-sm text-gray-400 py-10">No data available</p>
              ) : (
                <>
                  <div className="flex justify-center">
                    <PieChart width={220} height={220}>
                      <Tooltip formatter={(value, name) => [value, name]} />
                      <Pie data={pieData} dataKey="count" nameKey="service" innerRadius={60} outerRadius={100} strokeWidth={4}>
                        {pieData.map((entry, i) => (
                          <Cell key={`cell-${i}`} fill={entry.fill} />
                        ))}
                        <Label
                          content={({ viewBox }) => {
                            if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                              return (
                                <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                                  <tspan x={viewBox.cx} y={(viewBox.cy || 0) - 8} fontSize={24} fontWeight="bold" fill="#111">{totalBookings}</tspan>
                                  <tspan x={viewBox.cx} y={(viewBox.cy || 0) + 14} fontSize={11} fill="#9ca3af">Total</tspan>
                                </text>
                              );
                            }
                          }}
                        />
                      </Pie>
                    </PieChart>
                  </div>
                  <div className="mt-4 space-y-1.5">
                    {pieData.map((d) => {
                      const pct = totalBookings > 0 ? ((d.count / totalBookings) * 100).toFixed(0) : "0";
                      return (
                        <div key={d.service} className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: d.fill }} />
                            <span className="text-gray-600">{d.service}</span>
                          </div>
                          <span className="font-semibold text-gray-900">{d.count} ({pct}%)</span>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            {/* Status Breakdown Horizontal Bar */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 flex flex-col">
              <div className="flex items-center gap-2 mb-4 shrink-0">
                <BarChart3 className="w-5 h-5 text-gray-900" />
                <h2 className="text-lg font-bold text-gray-800">Status Breakdown</h2>
              </div>
              {barData.length === 0 ? (
                <p className="text-center text-sm text-gray-400 py-10">No data available</p>
              ) : (
                <ResponsiveContainer width="100%" height={Math.max(180, barData.length * 36)}>
                  <BarChart data={barData} layout="vertical" margin={{ left: 0, right: 40, top: 4, bottom: 4 }}>
                    <YAxis
                      dataKey="status"
                      type="category"
                      tickLine={false}
                      tickMargin={8}
                      axisLine={false}
                      width={145}
                      tick={{ fontSize: 11, fill: "#6b7280" }}
                    />
                    <XAxis dataKey="count" type="number" hide />
                    <Tooltip formatter={(value) => [value, "Bookings"]} />
                    <Bar dataKey="count" radius={4} barSize={18}>
                      {barData.map((entry, i) => (
                        <Cell key={`bar-${i}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Monthly Trend Table */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden mb-6">
            <div className="p-8 border-b border-gray-50 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-purple-600" />
              <h2 className="text-lg font-bold text-gray-800">Operational Trends</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-gray-50 text-gray-400 text-xs uppercase font-bold">
                  <tr>
                    <th className="px-8 py-4">Date Period</th>
                    <th className="px-8 py-4">Total Orders</th>
                    <th className="px-8 py-4">Total Revenue</th>
                    <th className="px-8 py-4">Avg. Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {Object.entries(monthlyData).length === 0 ? (
                    <tr><td colSpan={4} className="px-8 py-12 text-center text-gray-400 font-medium">No data found for this period</td></tr>
                  ) : (
                    Object.entries(monthlyData).map(([month, data]) => (
                      <tr key={month} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-8 py-4 text-sm font-bold text-gray-800">{month}</td>
                        <td className="px-8 py-4 text-sm font-medium text-gray-600">{data.count}</td>
                        <td className="px-8 py-4 text-sm font-bold text-green-600">RM {data.revenue.toFixed(2)}</td>
                        <td className="px-8 py-4 text-sm text-gray-400">RM {data.count > 0 ? (data.revenue / data.count).toFixed(2) : "0.00"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Reviews link */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 flex items-center gap-4">
            <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
            <p className="text-sm text-gray-600">Customer reviews and ratings have moved to the <strong>Reviews</strong> page.</p>
            <Link href="/admin/reviews" className="ml-auto px-4 py-2 bg-gray-900 text-white text-sm font-semibold rounded-xl hover:bg-gray-800 transition-all shrink-0">
              Go to Reviews
            </Link>
          </div>

        </div>
      </main>
    </div>
  );
}
