import { queryOptions, useQuery } from "@tanstack/react-query";

import {
  fetchAuditLogs,
  fetchDeletedProducts,
  fetchEnquiries,
  fetchMedia,
} from "@/lib/content-api";
import { contentKeys } from "@/hooks/use-content";

export const enquiriesQuery = () =>
  queryOptions({ queryKey: contentKeys.enquiries(), queryFn: fetchEnquiries, staleTime: 15_000 });

export const mediaQuery = () =>
  queryOptions({ queryKey: contentKeys.media(), queryFn: fetchMedia, staleTime: 15_000 });

export const auditQuery = () =>
  queryOptions({ queryKey: contentKeys.audit(), queryFn: fetchAuditLogs, staleTime: 15_000 });

export const trashQuery = () =>
  queryOptions({
    queryKey: ["products", "trash"] as const,
    queryFn: fetchDeletedProducts,
    staleTime: 15_000,
  });

export const useEnquiries = () => useQuery(enquiriesQuery());
export const useMedia = () => useQuery(mediaQuery());
export const useAuditLogs = () => useQuery(auditQuery());
export const useTrash = () => useQuery(trashQuery());
