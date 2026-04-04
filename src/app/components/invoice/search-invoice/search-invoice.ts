import { CommonModule } from '@angular/common';
import { Component, inject, ViewChild } from '@angular/core';
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
import { ConfirmationService, MenuItem, MessageService } from 'primeng/api';
import { Menu } from 'primeng/menu';
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
  @ViewChild('statusMenu') statusMenu?: Menu;

  private router = inject(Router);
  private invoiceService = inject(InvoiceService);
  private confirmationService = inject(ConfirmationService);
  private messageService = inject(MessageService);

  // streams
  private filter$ = new BehaviorSubject<any>(null);
  private searchText$ = new BehaviorSubject<string>('');

  loading = false;

  statusMenuItems: MenuItem[] = [];

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

  /** PrimeIcons class shown on the status tag */
  getStatusIcon(status: string | undefined): string {
    switch (status) {
      case 'Paid':
        return 'pi pi-check-circle';
      case 'Draft':
        return 'pi pi-file-edit';
      case 'Cancelled':
        return 'pi pi-times-circle';
      case 'Finalized':
        return 'pi pi-send';
      default:
        return 'pi pi-info-circle';
    }
  }

  isDraft(inv: any): boolean {
    return inv?.status === 'Draft';
  }

  /** Target statuses allowed from the current status (business rules). */
  getAllowedStatusTargets(current: string | undefined): string[] {
    const c = (current ?? '').trim();
    switch (c) {
      case 'Draft':
        return ['Finalized', 'Paid', 'Cancelled'];
      case 'Finalized':
        return ['Paid', 'Cancelled'];
      case 'Paid':
      case 'Cancelled':
      default:
        return [];
    }
  }

  canChangeStatus(current: string | undefined): boolean {
    return this.getAllowedStatusTargets(current).length > 0;
  }

  openStatusMenu(event: Event, inv: any) {
    const targets = this.getAllowedStatusTargets(inv.status);
    this.statusMenuItems = targets.map((newStatus) => ({
      label: `Change to ${newStatus}`,
      icon: this.getStatusIcon(newStatus),
      command: () => this.confirmStatusChange(inv, newStatus),
    }));
    this.statusMenu?.toggle(event);
  }

  confirmStatusChange(inv: any, newStatus: string) {
    this.confirmationService.confirm({
      header: 'Change invoice status',
      message: `You are about to change invoice "${inv.invoiceNumber}" from "${inv.status}" to "${newStatus}". Do you want to continue?`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Yes, change status',
      rejectLabel: 'Cancel',
      accept: () => this.performStatusChange(inv, newStatus),
    });
  }

  private performStatusChange(inv: any, newStatus: string) {
    this.invoiceService.updateInvoiceStatus(String(inv.id), newStatus).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Status updated',
          detail: `Invoice "${inv.invoiceNumber}" is now "${newStatus}".`,
        });
        this.filter$.next(this.filter$.getValue());
      },
      error: (err) => {
        console.error(err);
        this.messageService.add({
          severity: 'error',
          summary: 'Could not update status',
          detail: err?.error?.message || 'Please try again.',
        });
      },
    });
  }

  editInvoice(inv: any) {
    if (!this.isDraft(inv)) {
      return;
    }
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
