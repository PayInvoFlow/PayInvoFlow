import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { generateInvoiceFilePDFName } from '../../../helper/generateInvoiceFilePDFName';
import { SharedModule } from '../../../modules/shared.module';
import { InvoiceService } from '../../../services/invoice.service';
import { TagClasses, TagModule } from 'primeng/tag';

@Component({
  selector: 'app-search-invoice',
  imports: [SharedModule, CommonModule, TagModule],
  templateUrl: './search-invoice.html',
  styleUrls: ['./search-invoice.scss'],
})
export class SearchInvoice implements OnInit {
  invoices: any[] = [];
  filteredInvoices: any[] = [];
  searchText: string = '';
  loading: boolean = false;

  private router: Router = inject(Router);
  private invoiceService: InvoiceService = inject(InvoiceService);

  ngOnInit(): void {
    this.loadInvoices();
  }

  loadInvoices(filters?: any) {
    this.loading = true;
    this.invoiceService.searchInvoices(filters).subscribe({
      next: (res: any) => {
        this.invoices = res;
        this.filteredInvoices = [...res];
        this.loading = false;
      },
      error: (err: any) => {
        console.error('Error fetching invoices', err);
        this.loading = false;
      },
    });
  }

  filterInvoices() {
    const search = this.searchText.toLowerCase();
    this.filteredInvoices = this.invoices.filter(
      (inv) =>
        inv.invoiceNumber?.toLowerCase().includes(search) ||
        inv.companyName?.toLowerCase().includes(search) ||
        inv.clientName?.toLowerCase().includes(search) ||
        inv.status?.toLowerCase().includes(search),
    );
  }

  getSeverity(status: string): 'success' | 'secondary' | 'info' | 'warn' | 'danger' | 'contrast' | undefined | null{
    switch (status) {
      case 'Paid':
        return 'success';
      case 'Draft':
        return 'warn';
      case 'Cancelled':
        return 'danger';
      case 'Finalized':
        return 'info';
      default:
        return 'info';
    }
  }

  editInvoice(inv: any) {
    this.router.navigate(['/invoice/form', inv.id]);
  }

  confirmDelete(inv: any) {
    console.log('Delete', inv);
  }

  downloadPDFInvoice(inv: any) {
    this.invoiceService.downloadPDFInvoice(`${inv.id}`).subscribe({
      next: (blob: Blob) => {
        if (!blob || blob.size === 0) {
          console.error('Empty PDF response');
          return;
        }

        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = generateInvoiceFilePDFName(inv.companyName, inv.clientName, inv.invoiceDate);
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: (error) => {
        console.error('Error downloading PDF:', error);
      },
    });
  }
}
