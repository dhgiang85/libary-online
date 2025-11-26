
export type Page = 'HOME' | 'ADMIN' | 'NEWS' | 'LIBRARIAN' | 'LIBRARIAN_NEWS' | 'NEWS_DETAIL' | 'LIBRARIAN_NEWS_CREATE' | 'LIBRARIAN_NEWS_EDIT' | 'BOOK_DETAIL' | 'LIBRARIAN_BOOKS';


export enum CopyStatus {
  AVAILABLE = 'AVAILABLE',
  BORROWED = 'BORROWED',
  LOST = 'LOST'
}

export interface BookCopy {
  id: string;
  barcode: string;
  status: CopyStatus;
}

export interface BookStats {
  total: number;
  available: number;
  borrowed: number;
}

export interface BasicInfo {
  title: string;
  authors: string[];
  description: string;
  coverUrl: string;
}

export interface PublicationDetails {
  year: string | number;
  publisher: string;
  isbn: string;
  pages: string | number;
  depositFee?: string | number;  // Phí đặt cọc (VND)
  initialCopies?: string | number;
}

export interface ClassificationDetails {
  genres: string[];
  location: {
    floor: string;
    shelf: string;
    row: string;
  };
  keywords: string[];
}