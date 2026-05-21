import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export const useSettings = () => {
  const queryClient = useQueryClient()

  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const { data } = await supabase.from('settings').select('*').single()
      return data || {}
    },
  })

  const updateSettings = useMutation({
    mutationFn: async (newSettings: any) => {
      const { data } = await supabase.from('settings').upsert(newSettings)
      return data
    },
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
