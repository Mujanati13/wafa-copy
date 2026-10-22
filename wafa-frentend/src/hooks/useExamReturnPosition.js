import { useLayoutEffect, useRef } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';
import { readExamReturnPosition } from '@/utils/examNavigation';

export const useExamReturnPosition = (ready) => {
  const location = useLocation();
  const navigationType = useNavigationType();
  const activeKey = useRef(location.key);
  const restoredKey = useRef(null);
  const restoredPosition = useRef(null);

  useLayoutEffect(() => {
    const previous = window.history.scrollRestoration;
    window.history.scrollRestoration = 'manual';
    return () => { window.history.scrollRestoration = previous; };
  }, []);

  useLayoutEffect(() => {
    if (activeKey.current !== location.key) {
      activeKey.current = location.key;
      restoredKey.current = null;
    }
    if (!ready || restoredKey.current === location.key) return;
    if (navigationType !== 'POP' && !location.state?.examReturnPosition) return;
    const position = readExamReturnPosition(location);
    if (!position || (navigationType !== 'POP' && position === restoredPosition.current)) return;
    window.scrollTo({ ...position, behavior: 'instant' });
    restoredKey.current = location.key;
    restoredPosition.current = position;
  }, [ready, location, navigationType]);
};
