"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  deleteProfileAvatar,
  getProfile,
  updateProfile,
  uploadProfileAvatar,
  type ProfileResponse,
  type UpdateProfileInput,
} from "@/lib/api/profile";
import { queryKeys, STALE_TIMES } from "@/lib/query/keys";

export const useProfileQuery = (options?: { enabled?: boolean }) =>
  useQuery({
    queryKey: queryKeys.profile(),
    queryFn: getProfile,
    staleTime: STALE_TIMES.profile,
    enabled: options?.enabled ?? true,
  });

export const useUpdateProfileMutation = () => {
  const queryClient = useQueryClient();
  const key = queryKeys.profile();

  return useMutation({
    mutationFn: (input: UpdateProfileInput) => updateProfile(input),
    onSuccess: (profile) => {
      queryClient.setQueryData<ProfileResponse | null>(key, profile);
    },
  });
};

export const useUploadAvatarMutation = () => {
  const queryClient = useQueryClient();
  const key = queryKeys.profile();

  return useMutation({
    mutationFn: (file: File) => uploadProfileAvatar(file),
    onSuccess: ({ avatar_url }) => {
      queryClient.setQueryData<ProfileResponse | null>(key, (current) =>
        current ? { ...current, avatar_url: avatar_url || null } : current,
      );
      void queryClient.invalidateQueries({ queryKey: key });
    },
  });
};

export const useDeleteAvatarMutation = () => {
  const queryClient = useQueryClient();
  const key = queryKeys.profile();

  return useMutation({
    mutationFn: () => deleteProfileAvatar(),
    onSuccess: () => {
      queryClient.setQueryData<ProfileResponse | null>(key, (current) =>
        current ? { ...current, avatar_url: null } : current,
      );
      void queryClient.invalidateQueries({ queryKey: key });
    },
  });
};
