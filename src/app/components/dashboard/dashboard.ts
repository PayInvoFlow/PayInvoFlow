import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { CardModule } from 'primeng/card';
import { ChartModule } from 'primeng/chart';
import { TableModule } from 'primeng/table';
import { QuickAddInvoiceItem } from './quick-add-invoice-item/quick-add-invoice-item';
import { injectSpeedInsights } from '@vercel/speed-insights';


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
  imports: [ChartModule, CardModule, TableModule, CommonModule, QuickAddInvoiceItem],
  templateUrl: './dashboard.html',
  styles: [
    `
      :host {
        @apply block;
      }
      .pi {
        @apply text-2xl;
      }
      .p-card {
        @apply transition-all duration-300 hover:shadow-2xl;
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
  recentInvoices: IInvoice[] = [];
  invoiceAmountMap: { [key: string]: IInvoiceAmount } = {};
  topClients: ITopClient[] = [];

  ngOnInit() {
    injectSpeedInsights();
    this.initializeData();
    this.initializeCharts();
  }

  initializeData() {
    // Calculate summary metrics
    this.summary.totalClients = this.clients.length;
    this.summary.totalInvoices = this.invoices.length;
    this.summary.totalRevenue = this.invoiceAmounts.reduce((sum, ia) => sum + ia.grandTotal, 0);
    this.summary.paidInvoices = this.invoices.filter((i) => i.status === 'Paid').length;

    // Calculate overdue invoices
    const currentDate = new Date('2025-09-17');
    this.summary.overdueInvoices = this.invoices.filter(
      (i) => i.status === 'Draft' && i.dueDate && i.dueDate < currentDate,
    ).length;
    this.summary.overdueAmount = this.invoices
      .filter((i) => i.status === 'Draft' && i.dueDate && i.dueDate < currentDate)
      .reduce((sum, i) => sum + (this.invoiceAmountMap[i.invoiceNumber]?.grandTotal || 0), 0);

    // Map invoice amounts for easy lookup
    this.invoiceAmounts.forEach((ia) => {
      this.invoiceAmountMap[ia.invoice] = ia;
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
    // Chart options
    this.chartOptions = {
      responsive: true,
      plugins: {
        legend: {
          position: 'top',
          labels: {
            color: '#374151', // dark:text-gray-200
          },
        },
      },
      scales: {
        y: {
          ticks: {
            color: '#374151', // dark:text-gray-200
          },
          grid: {
            color: '#E5E7EB', // dark:bg-gray-700
          },
        },
        x: {
          ticks: {
            color: '#374151', // dark:text-gray-200
          },
          grid: {
            color: '#E5E7EB', // dark:bg-gray-700
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
    const currentDate = new Date('2025-09-17');
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
}
