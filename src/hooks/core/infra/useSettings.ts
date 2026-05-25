import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchSettings, saveSettings } from '@/services/settingService'
import { syncCache } from '@/utils/indexedDB'

export const useSettings = () => {
  const queryClient = useQueryClient()

  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const data = await fetchSettings()
      if (data) {
        syncCache.saveSettings(data).catch(console.warn);
      }
      return data || {}
    },
    staleTime: 1000 * 5,             // Keep settings fresh in cache for 5 seconds (allows rapid mounts, fetches on page entry)
    refetchOnWindowFocus: false,     // Disable automatic refetch when the browser window/iframe regains focus
    refetchOnReconnect: false        // Disable automatic refetch when reconnecting
  })

  const updateSettings = useMutation({
    mutationFn: saveSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] })
    },
  })

  return {
    settings,
    isLoading,
    updateSettings: updateSettings.mutateAsync,
    geminiApiKey: settings?.gemini_api_key,
    customModel: settings?.custom_model,
    accessPasscode: settings?.access_passcode,
  }
}
