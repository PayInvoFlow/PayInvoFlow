import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  inject,
  OnInit,
} from '@angular/core';
import { Router } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';
import { Company } from '../../../models/company.model';
import { SharedModule } from '../../../modules/shared.module';
import { CompanyService } from './../../../services/company.service';

@Component({
  selector: 'app-search-company',
  imports: [SharedModule],
  templateUrl: './search-company.html',
  styleUrl: './search-company.scss',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SearchCompany implements OnInit {
  companies: Company[] = [];
  loading: boolean = true;

  companyService: CompanyService = inject(CompanyService);
  messageService: MessageService = inject(MessageService);
  confirmationService: ConfirmationService = inject(ConfirmationService);
  private cd: ChangeDetectorRef = inject(ChangeDetectorRef);
  private router: Router = inject(Router);

  ngOnInit(): void {
    this.getCompanies();
  }

  getCompanies() {
    this.loading = true;
    this.companyService.getCompanies().subscribe({
      next: (data) => {
        this.companies = [...data];
        this.loading = false;
        this.cd.markForCheck();
      },
      error: (error) => {
        console.error(error);
        this.loading = false;
        this.cd.markForCheck();
      },
    });
  }

  deleteCompany(id: string) {
    this.companyService.deleteCompany(id).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Company deleted successfully',
        });
        this.getCompanies();
      },
      error: (error) => {
        console.error(error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to delete company',
        });
        this.cd.markForCheck();
      },
    });
  }

  confirmDelete(company: Company) {
    this.confirmationService.confirm({
      header: 'Delete Confirmation',
      message: `Are you sure you want to delete ${company.name}?`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Yes',
      rejectLabel: 'No',
      accept: () => {
        this.companies = this.companies.filter((c) => c._id !== company._id);
        this.cd.markForCheck();
        this.deleteCompany(company._id);
      },
    });
  }

  editCompany(company: Company) {
    this.router.navigate(['/company/form', company._id]);
  }

  getSeverity(status: string) : 'success' | 'secondary' | 'info' | 'warn' | 'danger' | 'contrast' | undefined | null {
    switch (status?.toLowerCase()) {
      case 'active':
        return 'success';
      case 'inactive':
        return 'danger';
      case 'pending':
        return 'warn';
      default:
        return 'info';
    }
  }
}
