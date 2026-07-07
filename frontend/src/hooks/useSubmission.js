import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';

// Loads and manages a candidate's submission bundle for one assignment type.
export function useSubmission(type) {
  const [bundle, setBundle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const reload = useCallback(async () => {
    try {
      const data = await api.getSubmission(type);
      setBundle(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [type]);

  useEffect(() => { reload(); }, [reload]);

  const locked = bundle && ['submitted', 'scoring', 'scored'].includes(bundle.submission.status);

  return { bundle, loading, error, reload, locked, setError };
}
