import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, combineLatest, Observable } from 'rxjs';
import {
  debounceTime,
  distinctUntilChanged,
  map,
  shareReplay,
  startWith,
  switchMap,
  tap,
} from 'rxjs/operators';
import { SharedModule } from '../../../modules/shared.module';
import { InvoiceService } from '../../../services/invoice.service';
import { TagModule } from 'primeng/tag';

@Component({
  selector: 'app-search-invoice',
  standalone: true,
  imports: [SharedModule, CommonModule, TagModule],
  templateUrl: './search-invoice.html',
  styleUrls: ['./search-invoice.scss'],
})
export class SearchInvoice {
  private router = inject(Router);
  private invoiceService = inject(InvoiceService);

  // streams
  private filter$ = new BehaviorSubject<any>(null);
  private searchText$ = new BehaviorSubject<string>('');

  loading = false;

  // Load invoices from API
  invoices$: Observable<any[]> = this.filter$.pipe(
    tap(() => (this.loading = true)),
    switchMap((filters) => this.invoiceService.searchInvoices(filters)),
    tap(() => (this.loading = false)),
    shareReplay(1),
  );

  // Filter invoices reactively
  filteredInvoices$: Observable<any[]> = combineLatest([
    this.invoices$,
    this.searchText$.pipe(debounceTime(300), distinctUntilChanged(), startWith('')),
  ]).pipe(
    map(([invoices, search]) => {
      if (!search) return invoices;

      const s = search.toLowerCase();
      return invoices.filter(
        (inv) =>
          inv.invoiceNumber?.toLowerCase().includes(s) ||
          inv.companyName?.toLowerCase().includes(s) ||
          inv.clientName?.toLowerCase().includes(s) ||
          inv.status?.toLowerCase().includes(s),
      );
    }),
    shareReplay(1),
  );

  // Trigger reload with filters
  loadInvoices(filters?: any) {
    this.filter$.next(filters);
  }

  // Trigger search
  filterInvoices(text: string) {
    this.searchText$.next(text);
  }

  getSeverity(
    status: string,
  ): 'success' | 'secondary' | 'info' | 'warn' | 'danger' | 'contrast' | undefined | null {
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
        a.download = inv.invoiceNumber + '.pdf';
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: (err) => console.error('Error downloading PDF:', err),
    });
  }
}
