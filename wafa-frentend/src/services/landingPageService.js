import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL;

/**
 * Get landing page settings (public endpoint)
 */
export const getLandingPageSettings = async () => {
  try {
    const response = await axios.get(`${API_URL}/landing-settings`, {
      withCredentials: true,
      params: { _ts: Date.now() },
      headers: { 'Cache-Control': 'no-cache' },
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching landing page settings:', error);
    throw error;
  }
};

/**
 * Update all landing page settings (admin only)
 */
export const updateLandingPageSettings = async (settings) => {
  try {
    const token = localStorage.getItem('token');
    const response = await axios.put(
      `${API_URL}/landing-settings`,
      settings,
      {
        withCredentials: true,
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error updating landing page settings:', error);
    throw error;
  }
};

/**
 * Update hero section (admin only)
 */
export const updateHeroSection = async (heroData) => {
  try {
    const token = localStorage.getItem('token');
    const response = await axios.patch(
      `${API_URL}/landing-settings/hero`,
      heroData,
      {
        withCredentials: true,
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error updating hero section:', error);
    throw error;
  }
};

/**
 * Update timer settings (admin only)
 */
export const updateTimerSettings = async (timerData) => {
  try {
    const token = localStorage.getItem('token');
    const response = await axios.patch(
      `${API_URL}/landing-settings/timer`,
      timerData,
      {
        withCredentials: true,
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error updating timer settings:', error);
    throw error;
  }
};

/**
 * Delete timer (admin only)
 */
export const deleteTimer = async () => {
  try {
    const token = localStorage.getItem('token');
    const response = await axios.patch(
      `${API_URL}/landing-settings/timer`,
      {
        timerEnabled: false,
        timerEndDate: null,
        timerTitle: '',
      },
      {
        withCredentials: true,
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error deleting timer:', error);
    throw error;
  }
};

/**
 * Update pricing section (admin only)
 */
export const updatePricingSection = async (pricingData) => {
  try {
    const token = localStorage.getItem('token');
    const response = await axios.patch(
      `${API_URL}/landing-settings/pricing`,
      pricingData,
      {
        withCredentials: true,
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error updating pricing section:', error);
    throw error;
  }
};

/**
 * Update FAQ section (admin only)
 */
export const updateFAQSection = async (faqData) => {
  try {
    const token = localStorage.getItem('token');
    const response = await axios.patch(
      `${API_URL}/landing-settings/faq`,
      faqData,
      {
        withCredentials: true,
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error updating FAQ section:', error);
    throw error;
  }
};

/**
 * Update contact section (admin only)
 */
export const updateContactSection = async (contactData) => {
  try {
    const token = localStorage.getItem('token');
    const response = await axios.patch(
      `${API_URL}/landing-settings/contact`,
      contactData,
      {
        withCredentials: true,
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error updating contact section:', error);
    throw error;
  }
};

/**
 * Update promotion banner (admin only)
 */
export const updatePromotionBanner = async (promotionData) => {
  try {
    const token = localStorage.getItem('token');
    const response = await axios.patch(
      `${API_URL}/landing-settings/promotion`,
      promotionData,
      {
        withCredentials: true,
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error updating promotion banner:', error);
    throw error;
  }
};

export default {
  getLandingPageSettings,
  updateLandingPageSettings,
  updateHeroSection,
  updateTimerSettings,
  deleteTimer,
  updatePricingSection,
  updateFAQSection,
  updateContactSection,
  updatePromotionBanner,
};
