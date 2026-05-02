import { supabase } from './client';
import { UVTSTemplate } from '../types/uvts';

export interface AdTemplateRecord {
  id: string;
  name: string;
  description: string;
  uvts_json: UVTSTemplate;
  created_at: string;
}

export const templateService = {
  async getTemplates() {
    const { data, error } = await supabase
      .from('ad_templates')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data as AdTemplateRecord[];
  },

  async saveTemplate(name: string, description: string, uvts: UVTSTemplate) {
    const { data, error } = await supabase
      .from('ad_templates')
      .insert([
        { name, description, uvts_json: uvts }
      ])
      .select()
      .single();
    
    if (error) throw error;
    return data as AdTemplateRecord;
  },

  async deleteTemplate(id: string) {
    const { error } = await supabase
      .from('ad_templates')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },

  async updateTemplate(id: string, updates: Partial<Omit<AdTemplateRecord, 'id' | 'created_at'>>) {
    const { data, error } = await supabase
      .from('ad_templates')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data as AdTemplateRecord;
  }
};
