import { useEffect } from 'react';

export function useDocumentTitle(title) {
  useEffect(() => {
    const prev = document.title;
    if (title) document.title = title;
    return () => {
      document.title = prev;
    };
  }, [title]);
}