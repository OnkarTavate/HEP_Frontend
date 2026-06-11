"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";

const DEBOUNCE_MS = 500;

/**
 * Reusable pagination hook for any list page.
 *
 * @param {Object} options
 * @param {string}  options.url          - API endpoint URL
 * @param {Object}  options.headers      - Request headers (e.g. Authorization)
 * @param {number}  [options.limit=20]   - Page size
 * @param {Object}  [options.extraParams={}] - Additional query params (e.g. { status: "pending" })
 * @param {boolean} [options.enabled=true]  - Set to false to disable auto-fetching
 *
 * @returns {{
 *   data: Array,
 *   counts: Object,
 *   pagination: Object,
 *   loading: boolean,
 *   searchInput: string,
 *   setSearchInput: Function,
 *   currentPage: number,
 *   setCurrentPage: Function,
 *   refresh: Function
 * }}
 */
export default function usePagination({
  url,
  headers = {},
  limit = 20,
  extraParams = {},
  enabled = true,
}) {
  const [data, setData] = useState([]);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalRecords: 0,
    pageSize: limit,
  });
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  // Serialize extraParams for dependency tracking
  const extraParamsKey = JSON.stringify(extraParams);

  // Debounce search — reset to page 1 on new search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput);
      setCurrentPage(1);
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Fetch data whenever page, search, or extraParams change
  const fetchData = useCallback(async () => {
    if (!enabled || !url) return;

    setLoading(true);
    try {
      const res = await axios.get(url, {
        headers,
        params: {
          page: currentPage,
          limit,
          search: debouncedSearch || undefined,
          ...extraParams,
        },
      });

      if (res.data && res.data.success) {
        setData(res.data.data || []);
        setPagination(res.data.pagination || {});
        setCounts(res.data.counts || {});
      } else {
        setData([]);
      }
    } catch (err) {
      console.error("Pagination fetch error:", err);
      setData([]);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, currentPage, limit, debouncedSearch, extraParamsKey, enabled]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    counts,
    pagination,
    loading,
    searchInput,
    setSearchInput,
    currentPage,
    setCurrentPage,
    refresh: fetchData,
  };
}
