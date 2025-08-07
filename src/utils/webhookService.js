import supabase from '../lib/supabase';

/**
 * Service to handle webhook interactions for HelmPlanner
 */
export default class WebhookService {
  /**
   * Trigger a webhook with data
   * 
   * @param {string} type - The webhook type ('schedule' or 'employees')
   * @param {Object} data - The data to send to the webhook
   * @returns {Promise<Object>} - Response from the webhook
   */
  static async triggerWebhook(type, data) {
    try {
      // Get webhook URL from settings or database
      const { data: webhookData, error } = await supabase
        .from('webhooks_helm')
        .select('url')
        .eq('type', type)
        .eq('enabled', true)
        .single();
      
      if (error || !webhookData) {
        console.warn(`No webhook URL found for type: ${type}`);
        return null;
      }
      
      const webhookUrl = webhookData.url;
      
      if (!webhookUrl) {
        return null;
      }
      
      // Send data to webhook
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
      });
      
      // Update the last triggered timestamp
      await supabase
        .from('webhooks_helm')
        .update({ last_triggered: new Date().toISOString() })
        .eq('type', type);
      
      if (!response.ok) {
        throw new Error(`Webhook error: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error triggering webhook:', error);
      return null;
    }
  }
  
  /**
   * Save webhook URL
   * 
   * @param {string} type - The webhook type ('schedule' or 'employees')
   * @param {string} url - The webhook URL
   * @returns {Promise<boolean>} - Success status
   */
  static async saveWebhookUrl(type, url) {
    try {
      // Check if webhook already exists
      const { data: existing } = await supabase
        .from('webhooks_helm')
        .select('id')
        .eq('type', type)
        .single();
      
      if (existing) {
        // Update existing webhook
        const { error } = await supabase
          .from('webhooks_helm')
          .update({ url })
          .eq('id', existing.id);
          
        return !error;
      } else {
        // Create new webhook
        const { error } = await supabase
          .from('webhooks_helm')
          .insert({ type, url });
          
        return !error;
      }
    } catch (error) {
      console.error('Error saving webhook URL:', error);
      return false;
    }
  }
  
  /**
   * Get webhook URL by type
   * 
   * @param {string} type - The webhook type ('schedule' or 'employees')
   * @returns {Promise<string|null>} - The webhook URL or null
   */
  static async getWebhookUrl(type) {
    try {
      const { data, error } = await supabase
        .from('webhooks_helm')
        .select('url')
        .eq('type', type)
        .single();
      
      if (error || !data) {
        return null;
      }
      
      return data.url;
    } catch (error) {
      console.error('Error getting webhook URL:', error);
      return null;
    }
  }
}