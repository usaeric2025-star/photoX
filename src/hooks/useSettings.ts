import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchSettings, saveSettings } from '../services/settingService'
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
