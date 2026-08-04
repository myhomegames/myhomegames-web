import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { searchWithMhgTvPreserved } from "../../utils/smartTv";

/**
 * Desktop `?mhgTv=1` is dropped by many `navigate('/game/…')` calls.
 * While the tab session still wants TV force, re-attach the query (replace).
 */
export default function PreserveMhgTvSearch() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const nextSearch = searchWithMhgTvPreserved(location.search);
    if (!nextSearch) return;
    navigate(
      {
        pathname: location.pathname,
        search: nextSearch,
        hash: location.hash,
      },
      { replace: true, state: location.state },
    );
  }, [
    location.pathname,
    location.search,
    location.hash,
    location.state,
    navigate,
  ]);

  return null;
}
