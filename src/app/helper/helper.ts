export class Helper {
  public static getSeverity(
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
}
