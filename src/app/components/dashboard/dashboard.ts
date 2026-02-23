import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CardModule } from 'primeng/card';
import { ChartModule } from 'primeng/chart';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { RippleModule } from 'primeng/ripple';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { SelectModule } from 'primeng/select';
import { MultiSelectModule } from 'primeng/multiselect';
import { DatePickerModule } from 'primeng/datepicker';
import { InputGroupModule } from 'primeng/inputgroup';
import { InputGroupAddonModule } from 'primeng/inputgroupaddon';
import { QuickAddInvoiceItem } from './quick-add-invoice-item/quick-add-invoice-item';
import { injectSpeedInsights } from '@vercel/speed-insights';
import { inject } from '@vercel/analytics';


// Define interfaces based on Mongoose models
interface IClient {
  name: string;
  address: string;
  email: string;
  phone: string;
  gstin: string;
  state: string;
  stateCode: string;
  status: 'Active' | 'Inactive';
}

interface IInvoice {
  invoiceNumber: string;
  invoiceDate: Date;
  client: string;
  company: string;
  cgstRate?: number;
  sgstRate?: number;
  status: 'Draft' | 'Paid' | 'Cancelled';
  dueDate?: Date;
}

interface IInvoiceAmount {
  invoice: string;
  subtotal: number;
  cgstAmount?: number;
  sgstAmount?: number;
  grandTotal: number;
  amountInWords: string;
}

interface ITopClient {
  name: string;
  totalInvoices: number;
  totalAmount: number;
  state: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    ChartModule,
    CardModule,
    TableModule,
    CommonModule,
    FormsModule,
    QuickAddInvoiceItem,
    RouterLink,
    ButtonModule,
    RippleModule,
    TagModule,
    TooltipModule,
    SelectModule,
    MultiSelectModule,
    DatePickerModule,
    InputGroupModule,
    InputGroupAddonModule,
  ],
  templateUrl: './dashboard.html',
  styles: [
    `
      :host {
        @apply block;
      }
      .dashboard-page {
        container-type: inline-size;
      }
      .p-card {
        transition: transform 0.2s ease, box-shadow 0.2s ease;
      }
      .p-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);
      }
      .dark .p-card:hover {
        box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.25);
      }
      .kpi-card:hover {
        transform: translateY(-3px) scale(1.01);
      }
      .status-draft {
        @apply text-yellow-600 dark:text-yellow-400 font-semibold;
      }
      .status-paid {
        @apply text-green-600 dark:text-green-400 font-semibold;
      }
      .status-cancelled {
        @apply text-red-600 dark:text-red-400 font-semibold;
      }
      .filter-pill {
        @apply inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium;
      }
      .greeting-title {
        font-family: 'Outfit', sans-serif;
        font-weight: 600;
        letter-spacing: -0.02em;
      }
      .chart-wrapper {
        position: relative;
        width: 100%;
        height: 100%;
        min-height: 0;
      }
      :host ::ng-deep .chart-wrapper canvas {
        max-width: 100% !important;
        max-height: 100% !important;
      }
      /* Dashboard tables: attractive and responsive */
      :host ::ng-deep .dashboard-table-wrapper {
        border-radius: 0.75rem;
        border: 1px solid rgba(0, 0, 0, 0.06);
        overflow: hidden;
      }
      :host .p-dark ::ng-deep .dashboard-table-wrapper,
      :host-context(.dark) ::ng-deep .dashboard-table-wrapper {
        border-color: rgba(255, 255, 255, 0.08);
      }
      :host ::ng-deep .dashboard-table .p-datatable-thead > tr > th {
        background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%);
        color: #475569;
        font-weight: 600;
        font-size: 0.75rem;
        padding: 0.75rem 1rem;
        border-bottom: 1px solid #e2e8f0;
      }
      :host .p-dark ::ng-deep .dashboard-table .p-datatable-thead > tr > th,
      :host-context(.dark) ::ng-deep .dashboard-table .p-datatable-thead > tr > th {
        background: linear-gradient(180deg, rgba(30, 41, 59, 0.8) 0%, rgba(15, 23, 42, 0.9) 100%);
        color: #94a3b8;
        border-bottom-color: rgba(255, 255, 255, 0.08);
      }
      :host ::ng-deep .dashboard-table .p-datatable-tbody > tr > td {
        padding: 0.65rem 1rem;
        font-size: 0.8125rem;
        border-bottom: 1px solid #f1f5f9;
        vertical-align: middle;
      }
      :host .p-dark ::ng-deep .dashboard-table .p-datatable-tbody > tr > td,
      :host-context(.dark) ::ng-deep .dashboard-table .p-datatable-tbody > tr > td {
        border-bottom-color: rgba(255, 255, 255, 0.06);
      }
      :host ::ng-deep .dashboard-table .p-datatable-tbody > tr:hover > td {
        background: #f8fafc !important;
      }
      :host .p-dark ::ng-deep .dashboard-table .p-datatable-tbody > tr:hover > td,
      :host-context(.dark) ::ng-deep .dashboard-table .p-datatable-tbody > tr:hover > td {
        background: rgba(51, 65, 85, 0.4) !important;
      }
      :host ::ng-deep .dashboard-table .p-datatable-tbody > tr.p-row-odd > td {
        background: rgba(248, 250, 252, 0.6);
      }
      :host .p-dark ::ng-deep .dashboard-table .p-datatable-tbody > tr.p-row-odd > td,
      :host-context(.dark) ::ng-deep .dashboard-table .p-datatable-tbody > tr.p-row-odd > td {
        background: rgba(30, 41, 59, 0.3);
      }
      @media (max-width: 640px) {
        :host ::ng-deep .dashboard-table .p-datatable-thead > tr > th,
        :host ::ng-deep .dashboard-table .p-datatable-tbody > tr > td {
          padding: 0.5rem 0.5rem;
          font-size: 0.75rem;
        }
      }
      /* Invoice Explorer: date pickers responsive and tidy */
      :host ::ng-deep .explorer-date.p-datepicker,
      :host ::ng-deep .explorer-filter {
        width: 100%;
        min-width: 0;
      }
      :host ::ng-deep .explorer-date .p-inputtext {
        width: 100%;
        min-width: 0;
        border-radius: 0.5rem;
      }
    `,
  ],
})
export class Dashboard implements OnInit {
  // Dummy data based on Mongoose models
  clients: IClient[] = [
    {
      name: 'ABC Corp',
      address: '123 Street, Mumbai',
      email: 'abc@corp.com',
      phone: '9876543210',
      gstin: '27AAAAA0000A1Z5',
      state: 'Maharashtra',
      stateCode: '27',
      status: 'Active',
    },
    {
      name: 'XYZ Ltd',
      address: '456 Road, Delhi',
      email: 'xyz@ltd.com',
      phone: '9123456789',
      gstin: '07AAAAA0000A1Z5',
      state: 'Delhi',
      stateCode: '07',
      status: 'Active',
    },
    {
      name: 'PQR Inc',
      address: '789 Avenue, Bangalore',
      email: 'pqr@inc.com',
      phone: '9988776655',
      gstin: '29AAAAA0000A1Z5',
      state: 'Karnataka',
      stateCode: '29',
      status: 'Inactive',
    },
    {
      name: 'LMN Ltd',
      address: '101 Lane, Chennai',
      email: 'lmn@ltd.com',
      phone: '9871234567',
      gstin: '33AAAAA0000A1Z5',
      state: 'Tamil Nadu',
      stateCode: '33',
      status: 'Active',
    },
  ];

  invoices: IInvoice[] = [
    {
      invoiceNumber: 'INV001',
      invoiceDate: new Date('2025-01-10'),
      client: 'ABC Corp',
      company: 'MyCompany',
      cgstRate: 6,
      sgstRate: 6,
      status: 'Paid',
      dueDate: new Date('2025-02-10'),
    },
    {
      invoiceNumber: 'INV002',
      invoiceDate: new Date('2025-02-15'),
      client: 'XYZ Ltd',
      company: 'MyCompany',
      cgstRate: 6,
      sgstRate: 6,
      status: 'Draft',
      dueDate: new Date('2025-03-15'),
    },
    {
      invoiceNumber: 'INV003',
      invoiceDate: new Date('2025-03-20'),
      client: 'PQR Inc',
      company: 'MyCompany',
      cgstRate: 6,
      sgstRate: 6,
      status: 'Cancelled',
      dueDate: new Date('2025-04-20'),
    },
    {
      invoiceNumber: 'INV004',
      invoiceDate: new Date('2025-04-01'),
      client: 'LMN Ltd',
      company: 'MyCompany',
      cgstRate: 6,
      sgstRate: 6,
      status: 'Draft',
      dueDate: new Date('2025-04-15'),
    },
    {
      invoiceNumber: 'INV005',
      invoiceDate: new Date('2025-05-10'),
      client: 'ABC Corp',
      company: 'MyCompany',
      cgstRate: 6,
      sgstRate: 6,
      status: 'Paid',
      dueDate: new Date('2025-05-20'),
    },
  ];

  invoiceAmounts: IInvoiceAmount[] = [
    {
      invoice: 'INV001',
      subtotal: 10000,
      cgstAmount: 600,
      sgstAmount: 600,
      grandTotal: 11200,
      amountInWords: 'Eleven Thousand Two Hundred',
    },
    {
      invoice: 'INV002',
      subtotal: 15000,
      cgstAmount: 900,
      sgstAmount: 900,
      grandTotal: 16800,
      amountInWords: 'Sixteen Thousand Eight Hundred',
    },
    {
      invoice: 'INV003',
      subtotal: 20000,
      cgstAmount: 1200,
      sgstAmount: 1200,
      grandTotal: 22400,
      amountInWords: 'Twenty-Two Thousand Four Hundred',
    },
    {
      invoice: 'INV004',
      subtotal: 25000,
      cgstAmount: 1500,
      sgstAmount: 1500,
      grandTotal: 28000,
      amountInWords: 'Twenty-Eight Thousand',
    },
    {
      invoice: 'INV005',
      subtotal: 18000,
      cgstAmount: 1080,
      sgstAmount: 1080,
      grandTotal: 20160,
      amountInWords: 'Twenty Thousand One Hundred Sixty',
    },
  ];

  // Summary data
  summary = {
    totalClients: 0,
    totalInvoices: 0,
    totalRevenue: 0,
    paidInvoices: 0,
    overdueInvoices: 0,
    overdueAmount: 0,
  };

  // Chart data
  invoiceStatusChartData: any;
  clientStateChartData: any;
  monthlyRevenueChartData: any;
  invoiceAgingChartData: any;
  invoiceStatusTrendChartData: any;
  chartOptions: any;
  doughnutChartOptions: any;
  recentInvoices: IInvoice[] = [];
  invoiceAmountMap: { [key: string]: IInvoiceAmount } = {};
  topClients: ITopClient[] = [];
  /** Invoices due in the next 7 days (draft only) */
  invoicesDueSoon: IInvoice[] = [];
  /** Revenue and count for current month (dummy: Jun 2025) */
  thisMonth = { revenue: 0, invoiceCount: 0 };
  /** Greeting and current date */
  today = new Date();

  /** Customizable widget: filters */
  filterStatus: string[] = [];
  filterClient = '';
  filterDateFrom: Date | null = null;
  filterDateTo: Date | null = null;
  /** View mode for customizable widget: table, bar, or line */
  customWidgetView: 'table' | 'bar' | 'line' = 'table';
  customViewOptions = [
    { label: 'Table', value: 'table' },
    { label: 'Bar chart', value: 'bar' },
    { label: 'Line chart', value: 'line' },
  ];
  statusOptions = [
    { label: 'Paid', value: 'Paid' },
    { label: 'Draft', value: 'Draft' },
    { label: 'Cancelled', value: 'Cancelled' },
  ];
  get clientOptions(): { label: string; value: string }[] {
    return this.clients.map((c) => ({ label: c.name, value: c.name }));
  }

  /** Filtered invoices based on customizable widget filters */
  get filteredInvoices(): IInvoice[] {
    let list = [...this.invoices];
    if (this.filterStatus.length > 0) {
      list = list.filter((i) => this.filterStatus.includes(i.status));
    }
    if (this.filterClient) {
      list = list.filter((i) => i.client === this.filterClient);
    }
    if (this.filterDateFrom) {
      list = list.filter((i) => new Date(i.invoiceDate) >= this.filterDateFrom!);
    }
    if (this.filterDateTo) {
      const to = new Date(this.filterDateTo);
      to.setHours(23, 59, 59, 999);
      list = list.filter((i) => new Date(i.invoiceDate) <= to);
    }
    return list;
  }

  /** Chart data for filtered invoices (by status count or by month) */
  get filteredChartData(): { labels: string[]; datasets: { label: string; data: number[]; backgroundColor?: string[]; borderColor?: string; fill?: boolean; tension?: number }[] } {
    if (this.customWidgetView === 'bar') {
      const statusCounts = { Paid: 0, Draft: 0, Cancelled: 0 };
      this.filteredInvoices.forEach((i) => (statusCounts[i.status as keyof typeof statusCounts] += 1));
      return {
        labels: ['Paid', 'Draft', 'Cancelled'],
        datasets: [
          {
            label: 'Count',
            data: [statusCounts.Paid, statusCounts.Draft, statusCounts.Cancelled],
            backgroundColor: ['#34D399', '#FBBF24', '#EF4444'],
          },
        ],
      };
    }
    if (this.customWidgetView === 'line') {
      const byMonth: { [key: string]: number } = {};
      this.filteredInvoices.forEach((i) => {
        const d = new Date(i.invoiceDate);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        byMonth[key] = (byMonth[key] || 0) + (this.invoiceAmountMap[i.invoiceNumber]?.grandTotal || 0);
      });
      const sorted = Object.keys(byMonth).sort();
      return {
        labels: sorted.map((k) => {
          const [y, m] = k.split('-');
          const date = new Date(parseInt(y, 10), parseInt(m, 10) - 1);
          return date.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
        }),
        datasets: [
          {
            label: 'Revenue (₹)',
            data: sorted.map((k) => byMonth[k]),
            fill: true,
            borderColor: '#8B5CF6',
            tension: 0.4,
          },
        ],
      };
    }
    return { labels: [], datasets: [] };
  }

  clearCustomFilters(): void {
    this.filterStatus = [];
    this.filterClient = '';
    this.filterDateFrom = null;
    this.filterDateTo = null;
  }

  /** Dummy activity feed for dashboard */
  activityItems: { icon: string; text: string; time: string; color: string }[] = [
    { icon: 'pi pi-check-circle', text: 'Invoice INV005 marked as Paid', time: '2 hours ago', color: 'text-emerald-500' },
    { icon: 'pi pi-file-edit', text: 'Invoice INV004 updated', time: '5 hours ago', color: 'text-amber-500' },
    { icon: 'pi pi-user-plus', text: 'New client LMN Ltd added', time: '1 day ago', color: 'text-blue-500' },
    { icon: 'pi pi-send', text: 'Invoice INV002 sent to XYZ Ltd', time: '2 days ago', color: 'text-violet-500' },
    { icon: 'pi pi-wallet', text: 'Payment received ₹11,200 (INV001)', time: '3 days ago', color: 'text-emerald-500' },
  ];

  ngOnInit() {
    inject();
    injectSpeedInsights();
    this.initializeData();
    this.initializeCharts();
  }

  initializeData() {
    // Map invoice amounts for easy lookup (must be first)
    this.invoiceAmounts.forEach((ia) => {
      this.invoiceAmountMap[ia.invoice] = ia;
    });

    // Calculate summary metrics
    this.summary.totalClients = this.clients.length;
    this.summary.totalInvoices = this.invoices.length;
    this.summary.totalRevenue = this.invoiceAmounts.reduce((sum, ia) => sum + ia.grandTotal, 0);
    this.summary.paidInvoices = this.invoices.filter((i) => i.status === 'Paid').length;

    // Calculate overdue invoices (use today for real UX; dummy data still works)
    const currentDate = this.today;
    this.summary.overdueInvoices = this.invoices.filter(
      (i) => i.status === 'Draft' && i.dueDate && i.dueDate < currentDate,
    ).length;
    this.summary.overdueAmount = this.invoices
      .filter((i) => i.status === 'Draft' && i.dueDate && i.dueDate < currentDate)
      .reduce((sum, i) => sum + (this.invoiceAmountMap[i.invoiceNumber]?.grandTotal || 0), 0);

    // Invoices due in the next 7 days (draft only)
    const in7Days = new Date(currentDate);
    in7Days.setDate(in7Days.getDate() + 7);
    this.invoicesDueSoon = this.invoices.filter(
      (i) =>
        i.status === 'Draft' &&
        i.dueDate &&
        i.dueDate >= currentDate &&
        i.dueDate <= in7Days,
    );
    // Demo: if none due soon, show one draft as "due in 3 days"
    if (this.invoicesDueSoon.length === 0) {
      const draft = this.invoices.find((i) => i.status === 'Draft');
      if (draft) {
        const dueIn3 = new Date(currentDate);
        dueIn3.setDate(dueIn3.getDate() + 3);
        this.invoicesDueSoon = [{ ...draft, dueDate: dueIn3 }];
      }
    }

    // This month stats (by invoice date)
    const y = this.today.getFullYear();
    const m = this.today.getMonth();
    this.invoices
      .filter((i) => {
        const d = new Date(i.invoiceDate);
        return d.getFullYear() === y && d.getMonth() === m;
      })
      .forEach((i) => {
        this.thisMonth.invoiceCount += 1;
        this.thisMonth.revenue += this.invoiceAmountMap[i.invoiceNumber]?.grandTotal || 0;
      });

    // Recent invoices (last 5)
    this.recentInvoices = this.invoices.slice(0, 5);

    // Top clients by invoice value
    const clientInvoiceMap = this.invoices.reduce(
      (acc, invoice) => {
        if (!acc[invoice.client]) {
          acc[invoice.client] = { totalInvoices: 0, totalAmount: 0 };
        }
        acc[invoice.client].totalInvoices += 1;
        acc[invoice.client].totalAmount +=
          this.invoiceAmountMap[invoice.invoiceNumber]?.grandTotal || 0;
        return acc;
      },
      {} as { [key: string]: { totalInvoices: number; totalAmount: number } },
    );

    this.topClients = Object.keys(clientInvoiceMap)
      .map((clientName) => ({
        name: clientName,
        totalInvoices: clientInvoiceMap[clientName].totalInvoices,
        totalAmount: clientInvoiceMap[clientName].totalAmount,
        state: this.clients.find((c) => c.name === clientName)?.state || '',
      }))
      .sort((a, b) => b.totalAmount - a.totalAmount)
      .slice(0, 5);
  }

  initializeCharts() {
    // Chart options – maintainAspectRatio: false so charts respect container height
    this.chartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
          labels: {
            color: '#374151',
            boxWidth: 12,
            padding: 8,
            font: { size: 11 },
          },
        },
      },
      scales: {
        y: {
          ticks: {
            color: '#374151',
            maxTicksLimit: 6,
            font: { size: 10 },
          },
          grid: {
            color: '#E5E7EB',
          },
        },
        x: {
          ticks: {
            color: '#374151',
            maxTicksLimit: 8,
            font: { size: 10 },
          },
          grid: {
            color: '#E5E7EB',
          },
        },
      },
    };
    this.doughnutChartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      layout: {
        padding: { top: 8, bottom: 8, left: 12, right: 12 },
      },
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            color: '#374151',
            boxWidth: 12,
            padding: 8,
            font: { size: 11 },
          },
        },
      },
    };

    // Invoice Status Pie Chart
    const statusCounts = {
      Paid: this.invoices.filter((i) => i.status === 'Paid').length,
      Draft: this.invoices.filter((i) => i.status === 'Draft').length,
      Cancelled: this.invoices.filter((i) => i.status === 'Cancelled').length,
    };

    this.invoiceStatusChartData = {
      labels: ['Paid', 'Draft', 'Cancelled'],
      datasets: [
        {
          data: [statusCounts.Paid, statusCounts.Draft, statusCounts.Cancelled],
          backgroundColor: ['#34D399', '#FBBF24', '#EF4444'],
          hoverBackgroundColor: ['#10B981', '#F59E0B', '#DC2626'],
        },
      ],
    };

    // Client State Bar Chart
    const stateCounts = this.clients.reduce(
      (acc, client) => {
        acc[client.state] = (acc[client.state] || 0) + 1;
        return acc;
      },
      {} as { [key: string]: number },
    );

    this.clientStateChartData = {
      labels: Object.keys(stateCounts),
      datasets: [
        {
          label: 'Clients by State',
          data: Object.values(stateCounts),
          backgroundColor: '#3B82F6',
          borderColor: '#2563EB',
          borderWidth: 1,
        },
      ],
    };

    // Monthly Revenue Line Chart (dummy data for 6 months)
    const monthlyRevenue = [
      { month: 'Jan 2025', revenue: 50000 },
      { month: 'Feb 2025', revenue: 60000 },
      { month: 'Mar 2025', revenue: 45000 },
      { month: 'Apr 2025', revenue: 70000 },
      { month: 'May 2025', revenue: 55000 },
      { month: 'Jun 2025', revenue: 80000 },
    ];

    this.monthlyRevenueChartData = {
      labels: monthlyRevenue.map((m) => m.month),
      datasets: [
        {
          label: 'Revenue (₹)',
          data: monthlyRevenue.map((m) => m.revenue),
          fill: false,
          borderColor: '#8B5CF6',
          tension: 0.4,
        },
      ],
    };

    // Invoice Aging Bar Chart
    const currentDate = this.today;
    const agingBuckets = {
      '0-30 Days': 0,
      '31-60 Days': 0,
      '61-90 Days': 0,
      '90+ Days': 0,
    };

    this.invoices.forEach((invoice) => {
      if (invoice.status === 'Draft' && invoice.dueDate) {
        const daysOverdue = Math.floor(
          (currentDate.getTime() - invoice.dueDate.getTime()) / (1000 * 60 * 60 * 24),
        );
        if (daysOverdue <= 30) agingBuckets['0-30 Days']++;
        else if (daysOverdue <= 60) agingBuckets['31-60 Days']++;
        else if (daysOverdue <= 90) agingBuckets['61-90 Days']++;
        else agingBuckets['90+ Days']++;
      }
    });

    this.invoiceAgingChartData = {
      labels: Object.keys(agingBuckets),
      datasets: [
        {
          label: 'Invoice Count',
          data: Object.values(agingBuckets),
          backgroundColor: '#F87171',
          borderColor: '#EF4444',
          borderWidth: 1,
        },
      ],
    };

    // Invoice Status Trend Line Chart (dummy data for 6 months)
    const statusTrend = [
      { month: 'Jan 2025', paid: 2, draft: 1, cancelled: 0 },
      { month: 'Feb 2025', paid: 3, draft: 2, cancelled: 1 },
      { month: 'Mar 2025', paid: 1, draft: 3, cancelled: 0 },
      { month: 'Apr 2025', paid: 4, draft: 1, cancelled: 2 },
      { month: 'May 2025', paid: 2, draft: 2, cancelled: 1 },
      { month: 'Jun 2025', paid: 3, draft: 1, cancelled: 0 },
    ];

    this.invoiceStatusTrendChartData = {
      labels: statusTrend.map((s) => s.month),
      datasets: [
        {
          label: 'Paid',
          data: statusTrend.map((s) => s.paid),
          fill: false,
          borderColor: '#34D399',
          tension: 0.4,
        },
        {
          label: 'Draft',
          data: statusTrend.map((s) => s.draft),
          fill: false,
          borderColor: '#FBBF24',
          tension: 0.4,
        },
        {
          label: 'Cancelled',
          data: statusTrend.map((s) => s.cancelled),
          fill: false,
          borderColor: '#EF4444',
          tension: 0.4,
        },
      ],
    };
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'Draft':
        return 'status-draft';
      case 'Paid':
        return 'status-paid';
      case 'Cancelled':
        return 'status-cancelled';
      default:
        return '';
    }
  }

  getGreeting(): string {
    const hour = this.today.getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }
}
