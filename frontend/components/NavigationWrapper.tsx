import { useNavigate } from 'react-router-dom';
import { Page } from '../types';

/**
 * Hook to convert old Page-based navigation to router-based navigation
 * This helps transition components gradually
 */
export const usePageNavigate = () => {
  const navigate = useNavigate();

  return (page: Page, id?: string) => {
    switch (page) {
      case 'HOME':
        navigate('/');
        break;
      case 'NEWS':
        navigate('/news');
        break;
      case 'NEWS_DETAIL':
        if (id) navigate(`/news/${id}`);
        break;
      case 'BOOK_DETAIL':
        if (id) navigate(`/books/${id}`);
        break;
      case 'LIBRARIAN':
        navigate('/librarian');
        break;
      case 'LIBRARIAN_NEWS':
        navigate('/librarian/news');
        break;
      case 'LIBRARIAN_NEWS_CREATE':
        navigate('/librarian/news/create');
        break;
      case 'LIBRARIAN_NEWS_EDIT':
        if (id) navigate(`/librarian/news/edit/${id}`);
        break;
      case 'LIBRARIAN_BOOKS':
        navigate('/librarian/books');
        break;
      default:
        navigate('/');
    }
  };
};
