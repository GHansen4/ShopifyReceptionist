export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function maskPhoneNumber(phone: string): string {
  return `***-***-${phone.slice(-4)}`;
}

export function formatCallDate(date: string): string {
  return new Date(date).toLocaleDateString();
}

export function getSentimentColor(sentiment: string): string {
  switch (sentiment) {
    case 'positive':
      return 'success';
    case 'negative':
      return 'critical';
    default:
      return 'info';
  }
}

export function getStatusBadge(status: string): string {
  switch (status) {
    case 'completed':
      return 'success';
    case 'abandoned':
      return 'attention';
    case 'escalated':
      return 'warning';
    default:
      return 'info';
  }
}
