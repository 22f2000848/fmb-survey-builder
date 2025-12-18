import axios from 'axios';

const API_BASE_URL = '/api';

// Survey API calls
export const surveyAPI = {
  // Get all surveys
  getAll: async () => {
    const response = await axios.get(`${API_BASE_URL}/surveys`);
    return response.data;
  },

  // Get survey by ID
  getById: async (surveyId) => {
    const response = await axios.get(`${API_BASE_URL}/surveys/${surveyId}`);
    return response.data;
  },

  // Create new survey
  create: async (surveyData) => {
    const response = await axios.post(`${API_BASE_URL}/surveys`, surveyData);
    return response.data;
  },

  // Update survey
  update: async (surveyId, surveyData) => {
    const response = await axios.put(`${API_BASE_URL}/surveys/${surveyId}`, surveyData);
    return response.data;
  },

  // Delete survey
  delete: async (surveyId) => {
    const response = await axios.delete(`${API_BASE_URL}/surveys/${surveyId}`);
    return response.data;
  }
};

// Question API calls
export const questionAPI = {
  // Get all questions for a survey
  getAll: async (surveyId) => {
    const response = await axios.get(`${API_BASE_URL}/surveys/${surveyId}/questions`);
    return response.data;
  },

  // Create new question
  create: async (surveyId, questionData) => {
    const response = await axios.post(`${API_BASE_URL}/surveys/${surveyId}/questions`, questionData);
    return response.data;
  },

  // Update question
  update: async (surveyId, questionId, questionData) => {
    const response = await axios.put(`${API_BASE_URL}/surveys/${surveyId}/questions/${questionId}`, questionData);
    return response.data;
  },

  // Delete question
  delete: async (surveyId, questionId) => {
    const response = await axios.delete(`${API_BASE_URL}/surveys/${surveyId}/questions/${questionId}`);
    return response.data;
  }
};

// Export API call
export const exportAPI = {
  // Download Excel for survey
  download: async (surveyId) => {
    const response = await axios.get(`${API_BASE_URL}/export/${surveyId}`, {
      responseType: 'blob'
    });
    
    // Create download link
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${surveyId}_dump.xlsx`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    
    return true;
  }
};
